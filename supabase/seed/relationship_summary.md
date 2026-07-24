# Seed data relationship summary

## Core entities
- Applicants are represented by rows in auth.users and are automatically mirrored into public.profiles and public.user_roles via the existing trigger.
- Applications belong to one applicant and can be in draft, submitted, under review, accepted, rejected, or withdrawn states.
- Assessments are standalone evaluation templates. Each assessment owns many assessment questions.
- Assessment attempts belong to one applicant and one assessment. A single attempt can have many attempt answers, though this seed focuses on the attempt row itself.
- Projects belong to one applicant and may later produce a certificate when completed.
- Certificates belong to one applicant and are typically issued after accepted applications or completed projects.

## Relationship flow
1. Applicant -> Application
   - One applicant can have many applications.
   - This seed creates 10 applications across 20 applicants.
2. Applicant -> Assessment Attempt
   - One applicant can take multiple assessments across different tracks.
   - This seed creates 25 attempts across 5 assessments.
3. Assessment -> Assessment Questions
   - One assessment owns many questions.
   - This seed creates 50 questions across 5 assessments.
4. Applicant -> Project
   - One applicant can own several projects.
   - This seed creates 15 projects for the applicant pool.
5. Applicant -> Certificate
   - One applicant can earn multiple certificates.
   - This seed creates 10 certificates.
6. Applicant -> Notification
   - One applicant can receive many notifications.
   - This seed creates 20 notifications.
7. Application -> Interview / Offer
   - An application can lead to one or more interview records and one or more offer records.
   - This seed creates 5 interviews and 5 offers tied to the application set.
8. Track -> Cohort
   - One track can be used by many cohorts.
   - This seed creates 3 tracks and 2 cohorts.
9. Cohort -> Cohort Member
   - A cohort has many applicants assigned to it.
   - This seed adds a small set of cohort memberships for realism.

## Intended use
- This data set is suitable for QA, UI walkthroughs, admin dashboards, and report testing.
- It is intentionally realistic but lightweight enough to be used as a seed for local development and demos.
