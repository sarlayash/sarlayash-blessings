export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity: string
          created_at: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          applicant_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          applicant_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          body: string
          cohort_id: string | null
          created_at: string
          created_by: string | null
          id: string
          recipient_ids: string[]
          scheduled_for: string | null
          send_email: boolean
          send_notification: boolean
          sent_at: string | null
          sent_count: number
          status: string
          title: string
          track: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_ids?: string[]
          scheduled_for?: string | null
          send_email?: boolean
          send_notification?: boolean
          sent_at?: string | null
          sent_count?: number
          status?: string
          title: string
          track?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_ids?: string[]
          scheduled_for?: string | null
          send_email?: boolean
          send_notification?: boolean
          sent_at?: string | null
          sent_count?: number
          status?: string
          title?: string
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          assigned_reviewer: string | null
          created_at: string
          decided_at: string | null
          deleted_at: string | null
          experience: string | null
          id: string
          motivation: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          program: string
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          track: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_reviewer?: string | null
          created_at?: string
          decided_at?: string | null
          deleted_at?: string | null
          experience?: string | null
          id?: string
          motivation?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          program: string
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          track?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_reviewer?: string | null
          created_at?: string
          decided_at?: string | null
          deleted_at?: string | null
          experience?: string | null
          id?: string
          motivation?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          program?: string
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          track?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assessment_answers: {
        Row: {
          answers: Json
          assessment_id: string
          created_at: string
          deleted_at: string | null
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_assignments: {
        Row: {
          assessment_id: string
          assigned_at: string
          assigned_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          created_at: string
          current_question_index: number
          id: string
          max_score: number
          metadata: Json
          passed: boolean
          percentage: number
          score: number
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          time_spent_seconds: number
          updated_at: string
          user_id: string
          violations_count: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          current_question_index?: number
          id?: string
          max_score?: number
          metadata?: Json
          passed?: boolean
          percentage?: number
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
          violations_count?: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          current_question_index?: number
          id?: string
          max_score?: number
          metadata?: Json
          passed?: boolean
          percentage?: number
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
          violations_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          attachment_url: string | null
          correct_answer: Json | null
          created_at: string
          description: string | null
          difficulty: string
          est_time_seconds: number
          explanation: string | null
          id: string
          image_url: string | null
          marks: number
          metadata: Json
          negative_marks: number
          options: Json
          order_index: number
          prompt: string
          tags: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          assessment_id: string
          attachment_url?: string | null
          correct_answer?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: string
          est_time_seconds?: number
          explanation?: string | null
          id?: string
          image_url?: string | null
          marks?: number
          metadata?: Json
          negative_marks?: number
          options?: Json
          order_index?: number
          prompt: string
          tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          attachment_url?: string | null
          correct_answer?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: string
          est_time_seconds?: number
          explanation?: string | null
          id?: string
          image_url?: string | null
          marks?: number
          metadata?: Json
          negative_marks?: number
          options?: Json
          order_index?: number
          prompt?: string
          tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_violations: {
        Row: {
          attempt_id: string
          created_at: string
          detail: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          detail?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_violations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          allow_review: boolean
          anti_cheat: Json
          assessment_type: string
          cohort: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          deleted_at: string | null
          description: string | null
          difficulty: string
          duration_minutes: number
          id: string
          instructions: string | null
          is_active: boolean
          max_attempts: number
          negative_marking: boolean
          passing_score: number
          published_at: string | null
          questions: Json
          shuffle_options: boolean
          shuffle_questions: boolean
          status: string
          title: string
          total_marks: number
          track: string | null
          updated_at: string
          violation_limit: number
        }
        Insert: {
          allow_review?: boolean
          anti_cheat?: Json
          assessment_type?: string
          cohort?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_attempts?: number
          negative_marking?: boolean
          passing_score?: number
          published_at?: string | null
          questions?: Json
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: string
          title: string
          total_marks?: number
          track?: string | null
          updated_at?: string
          violation_limit?: number
        }
        Update: {
          allow_review?: boolean
          anti_cheat?: Json
          assessment_type?: string
          cohort?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_attempts?: number
          negative_marking?: boolean
          passing_score?: number
          published_at?: string | null
          questions?: Json
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: string
          title?: string
          total_marks?: number
          track?: string | null
          updated_at?: string
          violation_limit?: number
        }
        Relationships: []
      }
      attempt_answers: {
        Row: {
          answer: Json | null
          attempt_id: string
          autosaved_at: string
          created_at: string
          id: string
          is_correct: boolean | null
          marked_for_review: boolean
          marks_awarded: number
          question_id: string
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: Json | null
          attempt_id: string
          autosaved_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          marks_awarded?: number
          question_id: string
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: Json | null
          attempt_id?: string
          autosaved_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          marks_awarded?: number
          question_id?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          created_at: string
          deleted_at: string | null
          id: string
          issued_at: string
          pdf_url: string | null
          title: string
          track: string | null
          updated_at: string
          user_id: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          issued_at?: string
          pdf_url?: string | null
          title: string
          track?: string | null
          updated_at?: string
          user_id: string
          verification_code?: string
        }
        Update: {
          certificate_number?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          issued_at?: string
          pdf_url?: string | null
          title?: string
          track?: string | null
          updated_at?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: []
      }
      cohort_members: {
        Row: {
          added_by: string | null
          cohort_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          cohort_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          cohort_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          capacity: number
          code: string
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          mentor_id: string | null
          name: string
          starts_on: string | null
          status: string
          timeline: Json
          track_id: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          code: string
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          mentor_id?: string | null
          name: string
          starts_on?: string | null
          status?: string
          timeline?: Json
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          code?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          mentor_id?: string | null
          name?: string
          starts_on?: string | null
          status?: string
          timeline?: Json
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          deleted_at: string | null
          id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          applicant_id: string
          application_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          feedback: string | null
          id: string
          location: string | null
          meeting_url: string | null
          mode: string
          panel: string[]
          rating: number | null
          recommendation: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          feedback?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          mode?: string
          panel?: string[]
          rating?: number | null
          recommendation?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          feedback?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          mode?: string
          panel?: string[]
          rating?: number | null
          recommendation?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          applicant_id: string
          application_id: string | null
          body: string
          created_at: string
          created_by: string | null
          deadline: string | null
          end_date: string | null
          id: string
          issued_at: string | null
          location: string | null
          offer_number: string
          pdf_url: string | null
          responded_at: string | null
          role_title: string
          start_date: string | null
          status: string
          stipend: string | null
          track: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          end_date?: string | null
          id?: string
          issued_at?: string | null
          location?: string | null
          offer_number: string
          pdf_url?: string | null
          responded_at?: string | null
          role_title: string
          start_date?: string | null
          status?: string
          stipend?: string | null
          track?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          end_date?: string | null
          id?: string
          issued_at?: string | null
          location?: string | null
          offer_number?: string
          pdf_url?: string | null
          responded_at?: string | null
          role_title?: string
          start_date?: string | null
          status?: string
          stipend?: string | null
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          areas_of_interest: string[]
          availability: string | null
          avatar_url: string | null
          bio: string | null
          branch: string | null
          career_objective: string | null
          cgpa: number | null
          city: string | null
          college: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          degree: string | null
          deleted_at: string | null
          dream_company: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          headline: string | null
          id: string
          languages: string[]
          linkedin_url: string | null
          location: string | null
          passing_year: number | null
          phone: string | null
          portfolio_url: string | null
          preferences: Json
          preferred_location: string | null
          resume_url: string | null
          semester: string | null
          skills: string[]
          state: string | null
          updated_at: string
        }
        Insert: {
          areas_of_interest?: string[]
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          career_objective?: string | null
          cgpa?: number | null
          city?: string | null
          college?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          degree?: string | null
          deleted_at?: string | null
          dream_company?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          headline?: string | null
          id: string
          languages?: string[]
          linkedin_url?: string | null
          location?: string | null
          passing_year?: number | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json
          preferred_location?: string | null
          resume_url?: string | null
          semester?: string | null
          skills?: string[]
          state?: string | null
          updated_at?: string
        }
        Update: {
          areas_of_interest?: string[]
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          career_objective?: string | null
          cgpa?: number | null
          city?: string | null
          college?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          degree?: string | null
          deleted_at?: string | null
          dream_company?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          languages?: string[]
          linkedin_url?: string | null
          location?: string | null
          passing_year?: number | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json
          preferred_location?: string | null
          resume_url?: string | null
          semester?: string | null
          skills?: string[]
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deadline: string | null
          deleted_at: string | null
          demo_url: string | null
          description: string | null
          difficulty: string | null
          feedback: string | null
          id: string
          mentor: string | null
          milestones: Json
          repo_url: string | null
          resources: Json
          reviewed_at: string | null
          score: number | null
          status: Database["public"]["Enums"]["project_status"]
          student_notes: string | null
          submission_url: string | null
          submitted_at: string | null
          title: string
          track: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string | null
          feedback?: string | null
          id?: string
          mentor?: string | null
          milestones?: Json
          repo_url?: string | null
          resources?: Json
          reviewed_at?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          student_notes?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          title: string
          track?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          demo_url?: string | null
          description?: string | null
          difficulty?: string | null
          feedback?: string | null
          id?: string
          mentor?: string | null
          milestones?: Json
          repo_url?: string | null
          resources?: Json
          reviewed_at?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          student_notes?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          title?: string
          track?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          category_id: string | null
          correct_answer: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          explanation: string | null
          id: string
          marks: number
          options: Json
          prompt: string
          tags: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          correct_answer?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json
          prompt: string
          tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          correct_answer?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json
          prompt?: string
          tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      question_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tracks: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          description: string | null
          duration_weeks: number
          id: string
          mentor_id: string | null
          name: string
          outcomes: string[]
          prerequisites: string[]
          skills: string[]
          slug: string
          status: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number
          id?: string
          mentor_id?: string | null
          name: string
          outcomes?: string[]
          prerequisites?: string[]
          skills?: string[]
          slug: string
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number
          id?: string
          mentor_id?: string | null
          name?: string
          outcomes?: string[]
          prerequisites?: string[]
          skills?: string[]
          slug?: string
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "applicant"
        | "admin"
        | "super_admin"
        | "mentor"
        | "reviewer"
        | "hr"
        | "placement"
        | "auditor"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "accepted"
        | "rejected"
        | "withdrawn"
      attempt_status:
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "abandoned"
      email_status: "queued" | "sending" | "sent" | "failed"
      pipeline_stage:
        | "applied"
        | "under_review"
        | "shortlisted"
        | "assessment_assigned"
        | "assessment_completed"
        | "project_assigned"
        | "project_submitted"
        | "interview_scheduled"
        | "selected"
        | "offer_released"
        | "internship_started"
        | "internship_completed"
        | "certificate_issued"
        | "rejected"
      project_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "reviewed"
        | "completed"
      question_type:
        | "mcq"
        | "multi_select"
        | "true_false"
        | "short_answer"
        | "long_answer"
        | "coding"
        | "file_upload"
        | "case_study"
        | "video_response"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "applicant",
        "admin",
        "super_admin",
        "mentor",
        "reviewer",
        "hr",
        "placement",
        "auditor",
      ],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      attempt_status: [
        "in_progress",
        "submitted",
        "auto_submitted",
        "abandoned",
      ],
      email_status: ["queued", "sending", "sent", "failed"],
      pipeline_stage: [
        "applied",
        "under_review",
        "shortlisted",
        "assessment_assigned",
        "assessment_completed",
        "project_assigned",
        "project_submitted",
        "interview_scheduled",
        "selected",
        "offer_released",
        "internship_started",
        "internship_completed",
        "certificate_issued",
        "rejected",
      ],
      project_status: [
        "not_started",
        "in_progress",
        "submitted",
        "reviewed",
        "completed",
      ],
      question_type: [
        "mcq",
        "multi_select",
        "true_false",
        "short_answer",
        "long_answer",
        "coding",
        "file_upload",
        "case_study",
        "video_response",
      ],
    },
  },
} as const
