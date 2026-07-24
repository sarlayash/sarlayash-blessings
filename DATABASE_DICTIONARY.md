# Database Dictionary

This document documents the database schema defined by the migration files in [supabase/migrations](supabase/migrations). It is a documentation-only summary of the existing database design and does not change any schema or migration.

## 1. Core design themes

The schema is organized around a multi-role internship platform with these major domains:

- Identity and access: user roles, profiles, staff helpers
- Applicant lifecycle: applications, pipeline history, interviews, offers, notes
- Learning and evaluation: assessments, assessment questions, attempts, answers, violations, question bank
- Project delivery: projects, milestones, resources, submission links
- Communication and operations: notifications, announcements, email queue, audit logs, analytics, settings
- Content and curriculum: tracks, cohorts, cohort membership, certificates

---

## 2. Table-by-table dictionary

### 1) user_roles
- Purpose: Stores the role assignments for authenticated users, including applicant/admin and the expanded staff roles introduced later.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: role (enum app_role), created_at
- Relationships: One user can have zero or many role rows; used by authorization helpers and policy checks.
- Row Level Security summary: RLS enabled. Authenticated users can read their own roles or roles if they are admins; admins can manage roles.
- Feature/module uses it: Auth, role-based route guarding, admin access control, staff workflows.
- Completeness: Appears complete for current access model; could be enhanced with more granular permissions and role metadata over time.

### 2) profiles
- Purpose: Stores the applicant profile record for each user, including identity and professional details.
- Primary key: id (uuid)
- Foreign keys: id -> auth.users(id)
- Important columns: email, full_name, avatar_url, phone, headline, bio, location, linkedin_url, github_url, portfolio_url, gender, date_of_birth, city, state, country, college, degree, branch, semester, passing_year, cgpa, resume_url, skills, languages, career_objective, areas_of_interest, dream_company, preferred_location, availability, preferences, deleted_at
- Relationships: One profile per auth user. Related to applications, projects, certificates, notifications, offers, admin notes, cohort memberships, and other user-owned records.
- Row Level Security summary: RLS enabled. Users can read/update/insert their own profile; admins can manage profiles.
- Feature/module uses it: Applicant profile page, admin applicant records, onboarding, portfolio and candidate evaluation.
- Completeness: Strong and fairly complete for applicant identity and profile management.

### 3) applications
- Purpose: Stores the candidate application record and core decision lifecycle.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id); assigned_reviewer -> auth.users(id)
- Important columns: program, track, status, motivation, experience, submitted_at, decided_at, reviewer_notes, pipeline_stage, assigned_reviewer, created_at, updated_at, deleted_at
- Relationships: One user can have many applications; related to pipeline_history, interviews, offers, admin notes, and assessment assignments/attempts conceptually.
- Row Level Security summary: RLS enabled. Users can read/manage their own applications; admins can manage all applications.
- Feature/module uses it: Applicant application submission, admin pipeline management, application review.
- Completeness: Core workflow is present and fairly complete; could be enhanced with richer workflow state and stronger reviewer assignment enforcement.

### 4) assessments
- Purpose: Stores assessment definitions and metadata for candidate evaluation.
- Primary key: id (uuid)
- Foreign keys: created_by -> auth.users(id)
- Important columns: title, description, track, duration_minutes, passing_score, questions, is_active, cohort, difficulty, status, published_at, deadline, total_marks, assessment_type, instructions, negative_marking, shuffle_questions, shuffle_options, max_attempts, allow_review, violation_limit, anti_cheat
- Relationships: One assessment has many assessment_questions, many assessment_attempts, and many assessment_assignments.
- Row Level Security summary: RLS enabled. Authenticated users can read published/active assessments; admins manage assessments.
- Feature/module uses it: Assessment authoring, candidate assessments, admin assessment administration.
- Completeness: Well-developed and fairly complete for a production assessment engine.

### 5) assessment_questions
- Purpose: Stores individual questions inside an assessment.
- Primary key: id (uuid)
- Foreign keys: assessment_id -> assessments(id)
- Important columns: order_index, type, prompt, description, image_url, attachment_url, marks, negative_marks, difficulty, est_time_seconds, tags, explanation, options, correct_answer, metadata
- Relationships: Belongs to one assessment; many attempt_answers reference questions indirectly through the attempt and question_id relationship.
- Row Level Security summary: RLS enabled. Admins can manage questions; authenticated users can read questions for accessible assessments.
- Feature/module uses it: Assessment content authoring and candidate question delivery.
- Completeness: Strong and fairly complete; could be enhanced with richer question banks and versioning.

### 6) assessment_answers
- Purpose: Stores the historical answer payload and scoring for assessments as a whole, prior to the newer attempt-based model.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id); assessment_id -> assessments(id)
- Important columns: answers, score, passed, started_at, submitted_at
- Relationships: One user can have multiple answer submissions per assessment; conceptually overlaps with assessment_attempts/attempt_answers.
- Row Level Security summary: RLS enabled. Users can manage their own answers; admins can manage all answers.
- Feature/module uses it: Legacy or direct assessment submission workflow.
- Completeness: Functional but somewhat overlapping with the newer attempt-based schema and could benefit from consolidation.

### 7) assessment_attempts
- Purpose: Stores a candidate’s attempt session for an assessment, including scoring and anti-cheat state.
- Primary key: id (uuid)
- Foreign keys: assessment_id -> assessments(id)
- Important columns: user_id, status, started_at, submitted_at, time_spent_seconds, score, max_score, percentage, passed, violations_count, current_question_index, metadata
- Relationships: One assessment has many attempts; one attempt has many attempt_answers and many assessment_violations.
- Row Level Security summary: RLS enabled. Users manage their own attempts; admins manage all attempts.
- Feature/module uses it: Assessment-taking experience, anti-cheat monitoring, result evaluation.
- Completeness: Strong and well-structured for an assessment platform.

### 8) attempt_answers
- Purpose: Stores the candidate’s answer records for each question within an assessment attempt.
- Primary key: id (uuid)
- Foreign keys: attempt_id -> assessment_attempts(id); question_id -> assessment_questions(id)
- Important columns: user_id, answer, marks_awarded, is_correct, time_spent_seconds, marked_for_review, autosaved_at
- Relationships: Many to one with assessment_attempts and assessment_questions; supports autosave and review flow.
- Row Level Security summary: RLS enabled. Users manage their own attempt answers; admins manage answers.
- Feature/module uses it: In-browser assessment taking, autosave, answer review.
- Completeness: Good fit for active assessment workflows.

### 9) assessment_violations
- Purpose: Records suspected cheating or anti-cheat events captured during an assessment attempt.
- Primary key: id (uuid)
- Foreign keys: attempt_id -> assessment_attempts(id)
- Important columns: user_id, type, detail, created_at
- Relationships: One attempt can have many violations.
- Row Level Security summary: RLS enabled. Users can insert and read their own violations; admins can read all violations.
- Feature/module uses it: Anti-cheat and academic integrity monitoring.
- Completeness: Functional and appropriate; could be enhanced with severity, resolution, and evidence metadata.

### 10) question_categories
- Purpose: Classifies question bank items into groups.
- Primary key: id (uuid)
- Foreign keys: None
- Important columns: name, description
- Relationships: One category can be used by many question_bank rows.
- Row Level Security summary: RLS enabled. Authenticated users can read categories; admins manage them.
- Feature/module uses it: Question bank organization and admin content management.
- Completeness: Basic but sufficient for current needs.

### 11) question_bank
- Purpose: Stores reusable question templates or banked questions for assessments.
- Primary key: id (uuid)
- Foreign keys: category_id -> question_categories(id); created_by -> auth.users(id) (not enforced in the migration as a hard FK but present as a plain uuid)
- Important columns: type, prompt, description, options, correct_answer, explanation, marks, difficulty, tags, created_by
- Relationships: Belongs to one category optionally; can be reused to build assessments.
- Row Level Security summary: RLS enabled. Admins manage question bank entries.
- Feature/module uses it: Assessment authoring and reusable question library management.
- Completeness: Solid foundation, though it would benefit from a stronger ownership model and version control.

### 12) assessment_assignments
- Purpose: Represents a per-user assignment of an assessment.
- Primary key: id (uuid)
- Foreign keys: assessment_id -> assessments(id); user_id is not a hard FK in the migration but used as a user identifier.
- Important columns: assigned_by, assigned_at
- Relationships: Many-to-many-style assignment table linking assessments to users.
- Row Level Security summary: RLS enabled. Admins manage assignments; users can read their own assignments.
- Feature/module uses it: Assessment scheduling and candidate assignment.
- Completeness: Good for simple assignment workflows; could be enhanced with assignment status and deadlines.

### 13) projects
- Purpose: Stores internship or portfolio project records submitted by applicants.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: title, description, track, status, repo_url, demo_url, submission_url, feedback, score, submitted_at, reviewed_at, difficulty, mentor, deadline, milestones, resources, student_notes
- Relationships: One user can have many projects; linked to tracks and mentor-related workflows conceptually.
- Row Level Security summary: RLS enabled. Users manage own projects; admins manage all projects.
- Feature/module uses it: Project tracking, portfolio review, mentor feedback, internship delivery.
- Completeness: Well-developed and fairly complete for project workflow management.

### 14) certificates
- Purpose: Stores issued certificates and public verification data.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: certificate_number, title, track, issued_at, pdf_url, verification_code
- Relationships: One certificate belongs to one user and is publicly verifiable by verification_code.
- Row Level Security summary: RLS enabled. Authenticated users can read their own certificates; anonymous users can read certificates for public verification; admins manage certificates.
- Feature/module uses it: Certificate issuance and public verification flow.
- Completeness: Strong and well-suited to current certificate workflows.

### 15) notifications
- Purpose: Stores in-app notifications for users.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: title, body, category, link, read_at
- Relationships: One user can have many notifications.
- Row Level Security summary: RLS enabled. Users can read/update their own notifications; admins can manage notifications.
- Feature/module uses it: Applicant and admin communication, offer and status updates.
- Completeness: Good basic model; could be enhanced with delivery channels and notification templates.

### 16) audit_logs
- Purpose: Stores administrative or operational actions for auditing and traceability.
- Primary key: id (uuid)
- Foreign keys: actor_id -> auth.users(id)
- Important columns: action, entity, entity_id, metadata, ip_address, user_agent
- Relationships: Related to many business entities through entity and entity_id; is an operational log table.
- Row Level Security summary: RLS enabled. Admins can read audit logs; authenticated users can insert logs for their own actions.
- Feature/module uses it: Admin audit trail, operational review.
- Completeness: Good foundation; could be enhanced with immutable storage, retention policies, and stronger event typing.

### 17) visitor_analytics
- Purpose: Stores anonymous or authenticated page-view analytics events.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: path, referrer, user_agent, ip_address, country, session_id, created_at
- Relationships: Captures interaction events without a strict entity relationship model.
- Row Level Security summary: RLS enabled. Anonymous and authenticated users can insert events; admins can read analytics.
- Feature/module uses it: Website analytics and engagement measurement.
- Completeness: Functional for basic analytics; could be enhanced with event taxonomy and retention policies.

### 18) email_queue
- Purpose: Stores outbound email jobs and their delivery state.
- Primary key: id (uuid)
- Foreign keys: None
- Important columns: to_email, template, subject, payload, status, attempts, last_error, sent_at
- Relationships: Independent operational table; not directly tied to other business tables.
- Row Level Security summary: RLS enabled. Admins can read/manage queue entries.
- Feature/module uses it: Communication automation, announcements and notifications delivery.
- Completeness: Good base model; could be enhanced with retries, provider metadata, and delivery receipts.

### 19) system_settings
- Purpose: Stores application-level settings and configuration values.
- Primary key: key (text)
- Foreign keys: updated_by -> auth.users(id)
- Important columns: value, description, created_at, updated_at
- Relationships: Configuration table; not strongly relational.
- Row Level Security summary: RLS enabled. Authenticated users can read settings; admins can manage them.
- Feature/module uses it: Feature flags, organization metadata, registration state configuration.
- Completeness: Lightweight and functional; could be enhanced with typed settings and versioning.

### 20) activity_logs
- Purpose: Stores user activity events such as interaction or action milestones.
- Primary key: id (uuid)
- Foreign keys: user_id -> auth.users(id)
- Important columns: activity, metadata
- Relationships: One user can have many activity log entries.
- Row Level Security summary: RLS enabled. Users can read/insert their own activity logs; admins can read all.
- Feature/module uses it: Activity history and audit-like user timeline.
- Completeness: Basic; could be expanded with action taxonomy and stronger retention rules.

### 21) pipeline_history
- Purpose: Records changes in the application pipeline stage over time.
- Primary key: id (uuid)
- Foreign keys: application_id -> applications(id); changed_by -> auth.users(id)
- Important columns: from_stage, to_stage, note, created_at
- Relationships: One application can have many pipeline history rows.
- Row Level Security summary: RLS enabled. Staff can read history; admins can insert history.
- Feature/module uses it: Pipeline auditing, review workflow, applicant progression tracking.
- Completeness: Good and appropriate for workflow tracking.

### 22) tracks
- Purpose: Stores available program tracks such as full-stack, AI/ML, data, and product.
- Primary key: id (uuid)
- Foreign keys: mentor_id -> auth.users(id); created_by -> auth.users(id)
- Important columns: slug, name, tagline, description, duration_weeks, capacity, prerequisites, skills, outcomes, status
- Relationships: One track can be used by many cohorts and projects; one track can be associated with many applications.
- Row Level Security summary: RLS enabled. Active tracks are public to anonymous users; admins manage tracks.
- Feature/module uses it: Program catalog, cohort setup, applicant track selection.
- Completeness: Strong and fairly complete for curriculum management.

### 23) cohorts
- Purpose: Stores groupings of applicants or learners by time and track.
- Primary key: id (uuid)
- Foreign keys: track_id -> tracks(id); mentor_id -> auth.users(id); created_by -> auth.users(id)
- Important columns: name, code, starts_on, ends_on, capacity, status, timeline
- Relationships: One track can have many cohorts; one cohort has many cohort_members.
- Row Level Security summary: RLS enabled. Staff can read cohorts; admins manage them.
- Feature/module uses it: Cohort-based program operations, admin cohort administration.
- Completeness: Good base model; could grow with richer cohort admin features.

### 24) cohort_members
- Purpose: Links users to cohorts and their role inside that cohort.
- Primary key: id (uuid)
- Foreign keys: cohort_id -> cohorts(id); user_id -> auth.users(id); added_by -> auth.users(id)
- Important columns: role, created_at
- Relationships: One cohort has many members; one user can be a member of many cohorts.
- Row Level Security summary: RLS enabled. Staff can read members; admins manage them; users can read their own membership.
- Feature/module uses it: Cohort participation, program grouping, staff operations.
- Completeness: Good and appropriate for cohort membership management.

### 25) interviews
- Purpose: Stores interview scheduling and outcome information for applicants.
- Primary key: id (uuid)
- Foreign keys: application_id -> applications(id); applicant_id -> auth.users(id); created_by -> auth.users(id)
- Important columns: panel, scheduled_at, duration_minutes, mode, meeting_url, location, status, rating, recommendation, feedback
- Relationships: One application can have zero or many interviews; one applicant can have many interviews.
- Row Level Security summary: RLS enabled. Staff can read interviews; applicants can read their own interviews; admins manage them.
- Feature/module uses it: Interview scheduling and review workflow.
- Completeness: Solid operational model; could be enriched with interviewer details and outcome history.

### 26) offers
- Purpose: Stores internship offers, response status, and offer letter content.
- Primary key: id (uuid)
- Foreign keys: application_id -> applications(id); applicant_id -> auth.users(id); created_by -> auth.users(id)
- Important columns: offer_number, role_title, track, stipend, start_date, end_date, location, body, status, issued_at, responded_at, deadline, pdf_url
- Relationships: One application can have zero or many offers; one applicant can have many offers over time.
- Row Level Security summary: RLS enabled. Staff and the applicant can read offers; applicants can respond to sent offers; admins manage offers.
- Feature/module uses it: Offer generation, response workflow, placement operations.
- Completeness: Good for current placement flow; could be enhanced with template/versioning and richer acceptance rules.

### 27) announcements
- Purpose: Stores internal or external announcements to targeted audiences.
- Primary key: id (uuid)
- Foreign keys: cohort_id -> cohorts(id); created_by -> auth.users(id)
- Important columns: title, body, audience, track, recipient_ids, send_email, send_notification, scheduled_for, sent_at, sent_count, status
- Relationships: Can target all users, a track, a cohort, or selected users; cohort_id is optional.
- Row Level Security summary: RLS enabled. Staff can read announcements; admins manage them.
- Feature/module uses it: Communications, cohort messaging, program announcements.
- Completeness: Good operational model; could be enhanced with audience segmentation and delivery tracking.

### 28) admin_notes
- Purpose: Stores staff notes associated with an applicant.
- Primary key: id (uuid)
- Foreign keys: applicant_id -> auth.users(id); author_id -> auth.users(id)
- Important columns: body, pinned, created_at, updated_at
- Relationships: One applicant can have many admin notes; each note has an author.
- Row Level Security summary: RLS enabled. Staff can read and insert notes; authors can update their own notes; admins can delete notes.
- Feature/module uses it: Internal applicant review and staff collaboration.
- Completeness: Appropriate for internal notes; could be enhanced with note categories and visibility controls.

---

## 3. ER-style relationship summary

```text
auth.users
  1 ──< user_roles
  1 ──< profiles
  1 ──< applications
  1 ──< projects
  1 ──< certificates
  1 ──< notifications
  1 ──< activity_logs
  1 ──< audit_logs (actor_id)
  1 ──< visitor_analytics (user_id)
  1 ──< admin_notes (applicant_id/author_id)
  1 ──< cohort_members (user_id)
  1 ──< interviews (applicant_id/created_by)
  1 ──< offers (applicant_id/created_by)
  1 ──< assessment_attempts (user_id)
  1 ──< assessment_answers (user_id)
  1 ──< assessment_assignments (user_id)

applications
  1 ──< pipeline_history
  1 ──< interviews
  1 ──< offers

assessments
  1 ──< assessment_questions
  1 ──< assessment_attempts
  1 ──< assessment_assignments

assessment_attempts
  1 ──< attempt_answers
  1 ──< assessment_violations

assessment_questions
  1 ──< attempt_answers

question_categories
  1 ──< question_bank

tracks
  1 ──< cohorts

cohorts
  1 ──< cohort_members
  1 ──< announcements

profiles
  1 ──< applications (via user_id, conceptually)
  1 ──< projects
  1 ──< certificates
```

### Relationship notes
- The schema is strongly user-centric: most business tables are keyed by user_id or applicant_id.
- Assessment data is modeled in a layered way with assessments, questions, attempts, attempt answers, and violations.
- Applicant workflow is represented through applications, pipeline history, interviews, offers, and admin notes.
- The platform also has strong curriculum and cohort organization through tracks, cohorts, and cohort membership.
- Operational metadata is captured through notifications, announcements, audit logs, analytics, email_queue, and system_settings.

---

## 4. Overall assessment

The schema is broad, role-aware, and reasonably production-oriented. It covers the core lifecycle of an internship platform from signup to certification and includes strong RLS patterns for privacy and access control.

The design appears mostly complete for the current product scope, with the main opportunities for enhancement being:
- richer lifecycle and workflow states for applications and offers
- stronger operational controls for audit retention and analytics volume
- more explicit domain constraints and metadata for communications and assignment workflows
- consolidation of overlapping assessment models where legacy and current structures coexist
