import { Attendance, Meeting, Recording } from '../models/index.js';

/**
 * Find recordings linked to a meeting (by meetingId or same day + session).
 */
export const findRecordingsForMeeting = async (meeting) => {
  if (!meeting) return [];

  const or = [{ dayNumber: meeting.dayNumber, sessionNumber: meeting.sessionNumber }];
  if (meeting._id) or.unshift({ meetingId: meeting._id });

  return Recording.find({
    isDeleted: false,
    $or: or
  });
};

/**
 * Add user IDs to recording allowedUsers; remove from deniedUsers.
 */
export const addUsersToRecordingAccess = async (recording, userIds = []) => {
  if (!recording || !userIds.length) return recording;

  const allowed = new Set((recording.allowedUsers || []).map((id) => id.toString()));
  const denied = new Set((recording.deniedUsers || []).map((id) => id.toString()));

  userIds.forEach((id) => {
    const uid = id.toString();
    allowed.add(uid);
    denied.delete(uid);
  });

  recording.allowedUsers = [...allowed];
  recording.deniedUsers = [...denied];
  await recording.save();
  return recording;
};

/**
 * Auto-grant video access to all absentees of a meeting (for linked recordings).
 */
export const grantVideoAccessToAbsentees = async (meetingId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
  if (!meeting) return { granted: 0, recordingsUpdated: 0 };

  const absentRecords = await Attendance.find({ meetingId, status: 'absent' }).select('userId');
  const userIds = absentRecords.map((r) => r.userId).filter(Boolean);
  if (!userIds.length) return { granted: 0, recordingsUpdated: 0 };

  const recordings = await findRecordingsForMeeting(meeting);
  for (const recording of recordings) {
    await addUsersToRecordingAccess(recording, userIds);
  }

  return { granted: userIds.length, recordingsUpdated: recordings.length };
};

/**
 * Grant a single absent user access to recordings for their meeting.
 */
export const grantVideoAccessToUserForMeeting = async (meetingId, userId) => {
  if (!meetingId || !userId) return { recordingsUpdated: 0 };

  const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
  if (!meeting) return { recordingsUpdated: 0 };

  const recordings = await findRecordingsForMeeting(meeting);
  for (const recording of recordings) {
    await addUsersToRecordingAccess(recording, [userId]);
  }

  return { recordingsUpdated: recordings.length };
};

/**
 * When a recording is created/updated, grant access to current absentees
 * of the linked meeting (or matching day/session meetings).
 */
export const grantAbsenteesForRecording = async (recording) => {
  if (!recording) return { granted: 0 };

  let meetings = [];
  if (recording.meetingId) {
    const m = await Meeting.findOne({ _id: recording.meetingId, isDeleted: false });
    if (m) meetings = [m];
  } else {
    meetings = await Meeting.find({
      isDeleted: false,
      dayNumber: recording.dayNumber,
      sessionNumber: recording.sessionNumber
    });
  }

  // Only auto-grant for completed meetings (everyone starts as absent before the session)
  meetings = meetings.filter((m) => m.status === 'completed');
  if (!meetings.length) return { granted: 0 };

  const meetingIds = meetings.map((m) => m._id);
  const absentRecords = await Attendance.find({
    meetingId: { $in: meetingIds },
    status: 'absent'
  }).select('userId');

  const userIds = [...new Set(absentRecords.map((r) => r.userId.toString()))];
  if (!userIds.length) return { granted: 0 };

  await addUsersToRecordingAccess(recording, userIds);
  return { granted: userIds.length };
};

export default {
  findRecordingsForMeeting,
  addUsersToRecordingAccess,
  grantVideoAccessToAbsentees,
  grantVideoAccessToUserForMeeting,
  grantAbsenteesForRecording
};
