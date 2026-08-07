import moment from 'moment';
import { Meeting, Attendance } from '../models/index.js';
import { grantVideoAccessToAbsentees } from './videoAccess.js';
import { sendMeetingReviewRequestEmail } from './emailService.js';

/**
 * Combine meeting date + HH:mm into a moment datetime (local server time).
 */
export const combineDateAndTime = (meetingDate, timeStr) => {
  if (!meetingDate || !timeStr) return null;
  const datePart = moment(meetingDate).format('YYYY-MM-DD');
  const parsed = moment(`${datePart} ${timeStr}`, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm'], true);
  return parsed.isValid() ? parsed : null;
};

export const getMeetingStart = (meeting) =>
  combineDateAndTime(meeting.meetingDate, meeting.startTime || meeting.meetingTime);

export const getMeetingEnd = (meeting) =>
  combineDateAndTime(meeting.meetingDate, meeting.endTime);

/**
 * Send review request emails to users who were present.
 */
export const sendReviewEmailsForMeeting = async (meeting) => {
  if (!meeting || meeting.reviewEmailSent) {
    return { sent: 0, skipped: true };
  }

  const present = await Attendance.find({
    meetingId: meeting._id,
    status: 'present'
  }).populate('userId', 'name email isActive isDeleted');

  let sent = 0;
  for (const row of present) {
    const user = row.userId;
    if (!user || user.isDeleted || user.isActive === false || !user.email) continue;
    const result = await sendMeetingReviewRequestEmail({
      userEmail: user.email,
      name: user.name,
      meetingTitle: meeting.title,
      meetingId: meeting._id.toString(),
      userId: user._id
    });
    if (result?.success) sent += 1;
  }

  meeting.reviewEmailSent = true;
  await meeting.save();

  return { sent, skipped: false };
};

/**
 * Complete a meeting: status, video access for absentees, review emails to attendees.
 */
export const completeMeetingAndNotify = async (meeting) => {
  if (!meeting || meeting.status === 'completed' || meeting.status === 'cancelled') {
    return { completed: false };
  }

  meeting.status = 'completed';
  await meeting.save();

  await grantVideoAccessToAbsentees(meeting._id);
  const emailResult = await sendReviewEmailsForMeeting(meeting);

  return { completed: true, emailResult };
};

/**
 * Cron-like job: auto live / auto complete based on start & end time.
 */
export const runMeetingScheduleJob = async () => {
  try {
    const now = moment();
    const openMeetings = await Meeting.find({
      isDeleted: false,
      status: { $in: ['upcoming', 'live'] }
    });

    let completed = 0;
    let wentLive = 0;

    for (const meeting of openMeetings) {
      const start = getMeetingStart(meeting);
      const end = getMeetingEnd(meeting);

      if (end && now.isSameOrAfter(end)) {
        await completeMeetingAndNotify(meeting);
        completed += 1;
        continue;
      }

      if (meeting.status === 'upcoming' && start && now.isSameOrAfter(start) && (!end || now.isBefore(end))) {
        meeting.status = 'live';
        await meeting.save();
        wentLive += 1;
      }
    }

    if (completed || wentLive) {
      console.log(`[MEETING JOB] live=${wentLive} completed=${completed}`);
    }
  } catch (err) {
    console.error('[MEETING JOB ERROR]', err.message);
  }
};

export default {
  combineDateAndTime,
  getMeetingStart,
  getMeetingEnd,
  sendReviewEmailsForMeeting,
  completeMeetingAndNotify,
  runMeetingScheduleJob
};
