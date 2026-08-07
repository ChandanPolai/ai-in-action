# AI in Action - MERN Stack Project Requirement Prompt

## Project Overview

Build a complete **AI in Action Learning Management System (LMS)** using the **MERN Stack (MongoDB, Express.js, React.js, Node.js)**.

The project structure, coding standards, folder organization, architecture, naming conventions, and best practices **must follow the existing "Coming Soon" project's backend and frontend structure**. Reuse the same architecture wherever applicable to maintain consistency across both projects.

The application should include two main panels:

* **Admin Panel**
* **User Panel**

The UI should be modern, responsive, clean, and easy to use.

---

# Authentication

## Admin Authentication

There will be a single Admin.

Admin should have the following fields:

* Name
* Email
* Password
* Profile Photo

Admin should be able to securely login and logout.

Passwords must be encrypted using industry best practices.

---

# User Management

The Admin should have complete control over users.

Each User will have:

* Name
* Email
* Mobile Number
* Country Code
* Password
* Profile Photo

Admin should be able to:

* Create User
* Edit User
* Delete User
* View User Details
* Reset/Change User Password
* Activate/Deactivate User
* Send Login Credentials to the user's email after account creation

---

# Dashboard

The Admin Dashboard should display:

* Total Users
* Active Users
* Inactive Users
* Total Meetings
* Upcoming Meetings
* Completed Meetings
* User Attendance Summary

---

# Meeting Management

The main purpose of this application is to manage our **AI in Action Course**, where users attend live Zoom sessions.

Admin should be able to:

* Create Meeting
* Edit Meeting
* Delete Meeting
* Schedule meetings by Date
* Schedule meetings by Time
* Add Meeting Title
* Add Meeting Description
* Add Zoom Meeting Link
* Organize meetings Day-wise or Session-wise

Users should see only the meetings assigned to them.

---

# Attendance Management

Attendance is one of the most important modules.

When a user clicks the Zoom meeting link and attends the session, the system should record the attendance.

Attendance status should include:

* Present
* Absent

Admin should be able to:

* View attendance for every meeting
* Filter attendance by Date
* Filter attendance by User
* View attendance history
* Export attendance if required in the future

---

# Session Recording Management

After every live session, the Admin uploads the recorded video.

For each recording, Admin should provide:

* Session Title
* Description
* Day Number
* Session Number
* Video File or Video URL
* Upload Date

---

# Video Access Rules

This module is extremely important.

Admin should have complete control over who can watch each session recording.

Requirements:

* Present users should not automatically get access to recordings.
* Absent users can be allowed to watch recordings.
* Admin should have a setting for every session to decide:

  * Which users can watch the recording.
  * Which users cannot watch the recording.
* Video access should be completely controlled from the Admin Panel.

This permission should be flexible and configurable.

---

# User Panel

Users should be able to:

* Login
* View their profile
* Update basic profile information (if allowed)
* View upcoming meetings
* Join Zoom meetings with a single click
* View attendance history
* Watch only the recordings that the Admin has permitted
* See session details day-wise

Users should not have access to any administrative functionality.

---

# Notifications (Future Ready)

Design the architecture in a way that future modules can be easily added, such as:

* Email Notifications
* WhatsApp Notifications


---

# Technical Requirements

* MERN Stack (MongoDB, Express.js, React.js, Node.js)
* Follow the same backend and frontend architecture as the existing "Coming Soon" project.
* Use a clean, modular, and scalable folder structure.
* Follow REST API best practices.
* Use JWT Authentication.
* Use Role-Based Access Control (Admin & User).
* Use reusable components and services.
* Write production-ready, maintainable, and scalable code.
* Keep the project future-proof so additional features can be added without major refactoring.

---

# Goal

The objective is to build a professional Admin and User Management System for the **AI in Action Course**, allowing the Admin to manage users, schedule Zoom sessions, track attendance, upload session recordings, and control video access permissions, while users can easily join meetings and access only the content they are authorized to view.



imp ::

white and blue theme i want use tailkwind css full mobile frilendy acces i want ok .....


-------------------------------
ok great abhi he naa 