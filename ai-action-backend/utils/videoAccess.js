import { Attendance, Meeting, Recording, Workshop } from '../models/index.js';

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
 * Add user IDs to a workshop's assignedUsers.
 */
export const addUsersToWorkshopAccess = async (workshopId, userIds = []) => {
  if (!workshopId || !userIds.length) return null;

  const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
  if (!workshop) return null;

  const assigned = new Set((workshop.assignedUsers || []).map((id) => id.toString()));
  userIds.forEach((id) => assigned.add(id.toString()));
  workshop.assignedUsers = [...assigned];
  await workshop.save();
  return workshop;
};

/**
 * Add absentees to the workshops of linked recordings.
 */
export const grantVideoAccessToAbsentees = async (meetingId) => {
  const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
  if (!meeting) return { granted: 0, workshopsUpdated: 0 };

  const absentRecords = await Attendance.find({ meetingId, status: 'absent' }).select('userId');
  const userIds = absentRecords.map((r) => r.userId).filter(Boolean);
  if (!userIds.length) return { granted: 0, workshopsUpdated: 0 };

  const recordings = await findRecordingsForMeeting(meeting);
  const workshopIds = [
    ...new Set(recordings.map((r) => r.workshopId?.toString()).filter(Boolean))
  ];

  for (const wid of workshopIds) {
    await addUsersToWorkshopAccess(wid, userIds);
  }

  return { granted: userIds.length, workshopsUpdated: workshopIds.length };
};

/**
 * Grant a single absent user access via workshops of linked recordings.
 */
export const grantVideoAccessToUserForMeeting = async (meetingId, userId) => {
  if (!meetingId || !userId) return { workshopsUpdated: 0 };

  const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
  if (!meeting) return { workshopsUpdated: 0 };

  const recordings = await findRecordingsForMeeting(meeting);
  const workshopIds = [
    ...new Set(recordings.map((r) => r.workshopId?.toString()).filter(Boolean))
  ];

  for (const wid of workshopIds) {
    await addUsersToWorkshopAccess(wid, [userId]);
  }

  return { workshopsUpdated: workshopIds.length };
};

/**
 * When a recording is created/updated, grant workshop access to absentees
 * of the linked meeting (or matching day/session meetings).
 */
export const grantAbsenteesForRecording = async (recording) => {
  if (!recording?.workshopId) return { granted: 0 };

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

  meetings = meetings.filter((m) => m.status === 'completed');
  if (!meetings.length) return { granted: 0 };

  const meetingIds = meetings.map((m) => m._id);
  const absentRecords = await Attendance.find({
    meetingId: { $in: meetingIds },
    status: 'absent'
  }).select('userId');

  const userIds = [...new Set(absentRecords.map((r) => r.userId.toString()))];
  if (!userIds.length) return { granted: 0 };

  await addUsersToWorkshopAccess(recording.workshopId, userIds);
  return { granted: userIds.length };
};

export default {
  findRecordingsForMeeting,
  addUsersToWorkshopAccess,
  grantVideoAccessToAbsentees,
  grantVideoAccessToUserForMeeting,
  grantAbsenteesForRecording
};
