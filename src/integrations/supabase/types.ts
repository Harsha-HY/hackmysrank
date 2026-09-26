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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_threads: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_threads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_analysis: Json | null
          applied_at: string
          aptitude_screen_recording_url: string | null
          candidate_id: string
          code_answers: Json | null
          cover_letter: string | null
          current_company: string
          current_ctc: number
          current_stage: string
          deleted_at: string | null
          expected_ctc: number
          experience_years: number
          id: string
          interview_score: number | null
          job_id: string
          notice_period: number
          overall_score: number | null
          photo_url: string | null
          rejection_reason: string | null
          rejection_stage: string | null
          resume_score: number | null
          resume_url: string | null
          status: string
          technical_rounds: string[] | null
          technical_score: number | null
          technical_screen_recording_url: string | null
          test_score: number | null
          test_status: string | null
          updated_at: string
          video_analysis: Json | null
          video_score: number | null
          video_url: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          applied_at?: string
          aptitude_screen_recording_url?: string | null
          candidate_id: string
          code_answers?: Json | null
          cover_letter?: string | null
          current_company: string
          current_ctc: number
          current_stage?: string
          deleted_at?: string | null
          expected_ctc: number
          experience_years: number
          id?: string
          interview_score?: number | null
          job_id: string
          notice_period: number
          overall_score?: number | null
          photo_url?: string | null
          rejection_reason?: string | null
          rejection_stage?: string | null
          resume_score?: number | null
          resume_url?: string | null
          status?: string
          technical_rounds?: string[] | null
          technical_score?: number | null
          technical_screen_recording_url?: string | null
          test_score?: number | null
          test_status?: string | null
          updated_at?: string
          video_analysis?: Json | null
          video_score?: number | null
          video_url?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          applied_at?: string
          aptitude_screen_recording_url?: string | null
          candidate_id?: string
          code_answers?: Json | null
          cover_letter?: string | null
          current_company?: string
          current_ctc?: number
          current_stage?: string
          deleted_at?: string | null
          expected_ctc?: number
          experience_years?: number
          id?: string
          interview_score?: number | null
          job_id?: string
          notice_period?: number
          overall_score?: number | null
          photo_url?: string | null
          rejection_reason?: string | null
          rejection_stage?: string | null
          resume_score?: number | null
          resume_url?: string | null
          status?: string
          technical_rounds?: string[] | null
          technical_score?: number | null
          technical_screen_recording_url?: string | null
          test_score?: number | null
          test_status?: string | null
          updated_at?: string
          video_analysis?: Json | null
          video_score?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          application_id: string
          approved_at: string | null
          company_id: string
          created_at: string
          created_by: string
          hr_approved: boolean
          hr_approved_at: string | null
          id: string
          job_id: string
          manager_approved: boolean
          manager_approved_at: string | null
          questions: Json
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          application_id: string
          approved_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          hr_approved?: boolean
          hr_approved_at?: string | null
          id?: string
          job_id: string
          manager_approved?: boolean
          manager_approved_at?: string | null
          questions?: Json
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          approved_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          hr_approved?: boolean
          hr_approved_at?: string | null
          id?: string
          job_id?: string
          manager_approved?: boolean
          manager_approved_at?: string | null
          questions?: Json
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bgv_documents: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          document_type: string
          file_url: string
          id: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bgv_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          application_id: string | null
          candidate_id: string
          created_at: string
          created_by: string
          created_by_name: string | null
          id: string
          is_deleted: boolean
          note_text: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          created_at?: string
          created_by: string
          created_by_name?: string | null
          id?: string
          is_deleted?: boolean
          note_text: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          id?: string
          is_deleted?: boolean
          note_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          about_me: string | null
          achievements: Json | null
          banner_url: string | null
          built_resume: Json | null
          certifications: Json | null
          completion_percentage: number | null
          courses: Json | null
          created_at: string
          current_ctc: number | null
          date_of_birth: string | null
          education: Json | null
          embedded_at: string | null
          embedding: string | null
          embedding_source: string | null
          expected_ctc: number | null
          experiences: Json | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          headline: string | null
          honors: Json | null
          id: string
          indeed_url: string | null
          interests: Json | null
          languages: Json | null
          linkedin_url: string | null
          location: string | null
          naukri_url: string | null
          notice_period_days: number | null
          open_to_relocation: boolean | null
          phone: string | null
          photo_url: string | null
          portfolio_url: string | null
          profile_completed: boolean | null
          projects: Json | null
          publications: Json | null
          resume_url: string | null
          skills: Json | null
          updated_at: string
          use_built_resume: boolean | null
          user_id: string
          volunteer_work: Json | null
          work_types: Json | null
        }
        Insert: {
          about_me?: string | null
          achievements?: Json | null
          banner_url?: string | null
          built_resume?: Json | null
          certifications?: Json | null
          completion_percentage?: number | null
          courses?: Json | null
          created_at?: string
          current_ctc?: number | null
          date_of_birth?: string | null
          education?: Json | null
          embedded_at?: string | null
          embedding?: string | null
          embedding_source?: string | null
          expected_ctc?: number | null
          experiences?: Json | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          headline?: string | null
          honors?: Json | null
          id?: string
          indeed_url?: string | null
          interests?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          naukri_url?: string | null
          notice_period_days?: number | null
          open_to_relocation?: boolean | null
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          profile_completed?: boolean | null
          projects?: Json | null
          publications?: Json | null
          resume_url?: string | null
          skills?: Json | null
          updated_at?: string
          use_built_resume?: boolean | null
          user_id: string
          volunteer_work?: Json | null
          work_types?: Json | null
        }
        Update: {
          about_me?: string | null
          achievements?: Json | null
          banner_url?: string | null
          built_resume?: Json | null
          certifications?: Json | null
          completion_percentage?: number | null
          courses?: Json | null
          created_at?: string
          current_ctc?: number | null
          date_of_birth?: string | null
          education?: Json | null
          embedded_at?: string | null
          embedding?: string | null
          embedding_source?: string | null
          expected_ctc?: number | null
          experiences?: Json | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          headline?: string | null
          honors?: Json | null
          id?: string
          indeed_url?: string | null
          interests?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          naukri_url?: string | null
          notice_period_days?: number | null
          open_to_relocation?: boolean | null
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          profile_completed?: boolean | null
          projects?: Json | null
          publications?: Json | null
          resume_url?: string | null
          skills?: Json | null
          updated_at?: string
          use_built_resume?: boolean | null
          user_id?: string
          volunteer_work?: Json | null
          work_types?: Json | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
          was_scheduled: boolean
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
          was_scheduled?: boolean
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
          was_scheduled?: boolean
        }
        Relationships: []
      }
      companies: {
        Row: {
          about: string | null
          avg_response_days: number | null
          banner_url: string | null
          benefits: string[]
          company_code: string
          company_name: string
          company_size: string | null
          created_at: string
          founded_year: number | null
          id: string
          industry: string
          location: string
          logo_url: string | null
          office_photos: Json
          owner_id: string
          plan: string
          slug: string | null
          status: string
          tagline: string | null
          tech_stack: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          about?: string | null
          avg_response_days?: number | null
          banner_url?: string | null
          benefits?: string[]
          company_code: string
          company_name: string
          company_size?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          industry?: string
          location: string
          logo_url?: string | null
          office_photos?: Json
          owner_id: string
          plan?: string
          slug?: string | null
          status?: string
          tagline?: string | null
          tech_stack?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          about?: string | null
          avg_response_days?: number | null
          banner_url?: string | null
          benefits?: string[]
          company_code?: string
          company_name?: string
          company_size?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          industry?: string
          location?: string
          logo_url?: string | null
          office_photos?: Json
          owner_id?: string
          plan?: string
          slug?: string | null
          status?: string
          tagline?: string | null
          tech_stack?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      gd_groups: {
        Row: {
          candidate_ids: string[]
          created_at: string
          gd_id: string
          group_name: string
          id: string
        }
        Insert: {
          candidate_ids?: string[]
          created_at?: string
          gd_id: string
          group_name: string
          id?: string
        }
        Update: {
          candidate_ids?: string[]
          created_at?: string
          gd_id?: string
          group_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gd_groups_gd_id_fkey"
            columns: ["gd_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      gd_scores: {
        Row: {
          ai_feedback: string | null
          candidate_id: string
          communication_score: number | null
          created_at: string
          gd_id: string
          group_id: string | null
          id: string
          leadership_score: number | null
          overall_gd_score: number | null
          points_quality: number | null
          relevance_score: number | null
          speaking_percentage: number | null
          speaking_time_minutes: number | null
          times_spoke: number | null
          verdict: string | null
        }
        Insert: {
          ai_feedback?: string | null
          candidate_id: string
          communication_score?: number | null
          created_at?: string
          gd_id: string
          group_id?: string | null
          id?: string
          leadership_score?: number | null
          overall_gd_score?: number | null
          points_quality?: number | null
          relevance_score?: number | null
          speaking_percentage?: number | null
          speaking_time_minutes?: number | null
          times_spoke?: number | null
          verdict?: string | null
        }
        Update: {
          ai_feedback?: string | null
          candidate_id?: string
          communication_score?: number | null
          created_at?: string
          gd_id?: string
          group_id?: string | null
          id?: string
          leadership_score?: number | null
          overall_gd_score?: number | null
          points_quality?: number | null
          relevance_score?: number | null
          speaking_percentage?: number | null
          speaking_time_minutes?: number | null
          times_spoke?: number | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_scores_gd_id_fkey"
            columns: ["gd_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gd_scores_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gd_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discussions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          daily_room_name: string | null
          daily_room_url: string | null
          duration: number
          ended_at: string | null
          id: string
          instructions: string | null
          job_id: string
          meeting_link: string | null
          recording_url: string | null
          scheduled_date: string
          scheduled_time: string
          started_at: string | null
          status: string
          topic: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          instructions?: string | null
          job_id: string
          meeting_link?: string | null
          recording_url?: string | null
          scheduled_date: string
          scheduled_time: string
          started_at?: string | null
          status?: string
          topic: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          instructions?: string | null
          job_id?: string
          meeting_link?: string | null
          recording_url?: string | null
          scheduled_date?: string
          scheduled_time?: string
          started_at?: string | null
          status?: string
          topic?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_discussions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_process_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          stages: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_process_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_process_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_process_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          candidate_id: string
          company_id: string
          created_at: string
          daily_room_name: string | null
          daily_room_url: string | null
          duration: number
          ended_at: string | null
          id: string
          interviewer_id: string
          interviewer_name: string
          job_id: string
          meeting_link: string | null
          mode: string
          notes: string | null
          recommendation: string | null
          recording_url: string | null
          round_type: string
          scheduled_date: string
          scheduled_time: string
          scorecard: Json | null
          started_at: string | null
          status: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          company_id: string
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          interviewer_id: string
          interviewer_name: string
          job_id: string
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          recommendation?: string | null
          recording_url?: string | null
          round_type?: string
          scheduled_date: string
          scheduled_time: string
          scorecard?: Json | null
          started_at?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          company_id?: string
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          interviewer_id?: string
          interviewer_name?: string
          job_id?: string
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          recommendation?: string | null
          recording_url?: string | null
          round_type?: string
          scheduled_date?: string
          scheduled_time?: string
          scorecard?: Json | null
          started_at?: string | null
          status?: string
          transcript?: string | null
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
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_templates: {
        Row: {
          aptitude_cutoff_score: number | null
          company_id: string
          created_at: string
          created_by: string
          department: string | null
          employment_type: string | null
          experience_max: number | null
          experience_min: number | null
          id: string
          job_description: string | null
          job_title: string | null
          last_used_at: string | null
          location: string | null
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          template_name: string
          updated_at: string
          work_type: string | null
        }
        Insert: {
          aptitude_cutoff_score?: number | null
          company_id: string
          created_at?: string
          created_by: string
          department?: string | null
          employment_type?: string | null
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          last_used_at?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          template_name: string
          updated_at?: string
          work_type?: string | null
        }
        Update: {
          aptitude_cutoff_score?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          department?: string | null
          employment_type?: string | null
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          last_used_at?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          template_name?: string
          updated_at?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applications_count: number
          aptitude_cutoff: number
          aptitude_questions: Json | null
          company_id: string
          created_at: string
          department: string
          embedded_at: string | null
          embedding: string | null
          embedding_source: string | null
          employment_type: string
          experience_max: number | null
          experience_min: number | null
          id: string
          job_description: string | null
          location: string
          manager_id: string | null
          pipeline_stages: Json | null
          pipeline_template_id: string | null
          posted_by: string
          resume_cutoff: number
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          status: string
          title: string
          updated_at: string
          work_type: string
        }
        Insert: {
          applications_count?: number
          aptitude_cutoff?: number
          aptitude_questions?: Json | null
          company_id: string
          created_at?: string
          department: string
          embedded_at?: string | null
          embedding?: string | null
          embedding_source?: string | null
          employment_type?: string
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          job_description?: string | null
          location: string
          manager_id?: string | null
          pipeline_stages?: Json | null
          pipeline_template_id?: string | null
          posted_by: string
          resume_cutoff?: number
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string
          title: string
          updated_at?: string
          work_type?: string
        }
        Update: {
          applications_count?: number
          aptitude_cutoff?: number
          aptitude_questions?: Json | null
          company_id?: string
          created_at?: string
          department?: string
          embedded_at?: string | null
          embedding?: string | null
          embedding_source?: string | null
          employment_type?: string
          experience_max?: number | null
          experience_min?: number | null
          id?: string
          job_description?: string | null
          location?: string
          manager_id?: string | null
          pipeline_stages?: Json | null
          pipeline_template_id?: string | null
          posted_by?: string
          resume_cutoff?: number
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "interview_process_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          offer_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          offer_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          offer_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offer_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_letters: {
        Row: {
          accept_by: string
          accepted_at: string | null
          application_id: string
          basic_salary: number
          candidate_id: string
          company_id: string
          created_at: string
          ctc_total: number
          decline_reason: string | null
          department: string
          designation: string
          esops: number | null
          hra: number
          id: string
          job_id: string
          joining_date: string
          other_allowances: number
          performance_bonus: number
          probation_period: string
          status: string
          updated_at: string
          work_location: string
          work_type: string
        }
        Insert: {
          accept_by: string
          accepted_at?: string | null
          application_id: string
          basic_salary?: number
          candidate_id: string
          company_id: string
          created_at?: string
          ctc_total: number
          decline_reason?: string | null
          department: string
          designation: string
          esops?: number | null
          hra?: number
          id?: string
          job_id: string
          joining_date: string
          other_allowances?: number
          performance_bonus?: number
          probation_period?: string
          status?: string
          updated_at?: string
          work_location: string
          work_type?: string
        }
        Update: {
          accept_by?: string
          accepted_at?: string | null
          application_id?: string
          basic_salary?: number
          candidate_id?: string
          company_id?: string
          created_at?: string
          ctc_total?: number
          decline_reason?: string | null
          department?: string
          designation?: string
          esops?: number | null
          hra?: number
          id?: string
          job_id?: string
          joining_date?: string
          other_allowances?: number
          performance_bonus?: number
          probation_period?: string
          status?: string
          updated_at?: string
          work_location?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          last_used_at: string | null
          logo_url: string | null
          template_config: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          logo_url?: string | null
          template_config?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          logo_url?: string | null
          template_config?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      prep_sessions: {
        Row: {
          application_id: string
          average_score: number
          candidate_id: string
          created_at: string
          id: string
          last_practiced: string
          questions_answered: number
          stage: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          application_id: string
          average_score?: number
          candidate_id: string
          created_at?: string
          id?: string
          last_practiced?: string
          questions_answered?: number
          stage: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          average_score?: number
          candidate_id?: string
          created_at?: string
          id?: string
          last_practiced?: string
          questions_answered?: number
          stage?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          created_at: string
          delivered_message_id: string | null
          error: string | null
          id: string
          message: string
          receiver_id: string
          scheduled_at: string
          sender_id: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_message_id?: string | null
          error?: string | null
          id?: string
          message: string
          receiver_id: string
          scheduled_at: string
          sender_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_message_id?: string | null
          error?: string | null
          id?: string
          message?: string
          receiver_id?: string
          scheduled_at?: string
          sender_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          application_id: string
          created_at: string
          id: string
          question_index: number
          selected_option: number | null
          time_spent_seconds: number | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          question_index: number
          selected_option?: number | null
          time_spent_seconds?: number | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          question_index?: number
          selected_option?: number | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      test_violations: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          description: string
          id: string
          job_id: string
          question_number: number | null
          violation_type: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          description: string
          id?: string
          job_id: string
          question_number?: number | null
          violation_type: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          question_number?: number | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_violations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_message_received: boolean
          email_new_application: boolean
          email_offer_accepted: boolean
          email_stage_changed: boolean
          email_test_submitted: boolean
          email_violation_detected: boolean
          push_message_received: boolean
          push_new_application: boolean
          push_offer_accepted: boolean
          push_stage_changed: boolean
          push_test_submitted: boolean
          push_violation_detected: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_message_received?: boolean
          email_new_application?: boolean
          email_offer_accepted?: boolean
          email_stage_changed?: boolean
          email_test_submitted?: boolean
          email_violation_detected?: boolean
          push_message_received?: boolean
          push_new_application?: boolean
          push_offer_accepted?: boolean
          push_stage_changed?: boolean
          push_test_submitted?: boolean
          push_violation_detected?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_message_received?: boolean
          email_new_application?: boolean
          email_offer_accepted?: boolean
          email_stage_changed?: boolean
          email_test_submitted?: boolean
          email_violation_detected?: boolean
          push_message_received?: boolean
          push_new_application?: boolean
          push_offer_accepted?: boolean
          push_stage_changed?: boolean
          push_test_submitted?: boolean
          push_violation_detected?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_public: {
        Row: {
          company_name: string | null
          id: string | null
          industry: string | null
          location: string | null
        }
        Insert: {
          company_name?: string | null
          id?: string | null
          industry?: string | null
          location?: string | null
        }
        Update: {
          company_name?: string | null
          id?: string | null
          industry?: string | null
          location?: string | null
        }
        Relationships: []
      }
      company_public_profiles: {
        Row: {
          about: string | null
          avg_response_days: number | null
          banner_url: string | null
          benefits: string[] | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          founded_year: number | null
          id: string | null
          industry: string | null
          location: string | null
          logo_url: string | null
          office_photos: Json | null
          slug: string | null
          tagline: string | null
          tech_stack: string[] | null
          website: string | null
        }
        Insert: {
          about?: string | null
          avg_response_days?: number | null
          banner_url?: string | null
          benefits?: string[] | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          founded_year?: number | null
          id?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          office_photos?: Json | null
          slug?: string | null
          tagline?: string | null
          tech_stack?: string[] | null
          website?: string | null
        }
        Update: {
          about?: string | null
          avg_response_days?: number | null
          banner_url?: string | null
          benefits?: string[] | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          founded_year?: number | null
          id?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          office_photos?: Json | null
          slug?: string | null
          tagline?: string | null
          tech_stack?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_message_received: boolean | null
          email_new_application: boolean | null
          email_offer_accepted: boolean | null
          email_stage_changed: boolean | null
          email_test_submitted: boolean | null
          email_violation_detected: boolean | null
          push_message_received: boolean | null
          push_new_application: boolean | null
          push_offer_accepted: boolean | null
          push_stage_changed: boolean | null
          push_test_submitted: boolean | null
          push_violation_detected: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_message_received?: boolean | null
          email_new_application?: boolean | null
          email_offer_accepted?: boolean | null
          email_stage_changed?: boolean | null
          email_test_submitted?: boolean | null
          email_violation_detected?: boolean | null
          push_message_received?: boolean | null
          push_new_application?: boolean | null
          push_offer_accepted?: boolean | null
          push_stage_changed?: boolean | null
          push_test_submitted?: boolean | null
          push_violation_detected?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_message_received?: boolean | null
          email_new_application?: boolean | null
          email_offer_accepted?: boolean | null
          email_stage_changed?: boolean | null
          email_test_submitted?: boolean | null
          email_violation_detected?: boolean | null
          push_message_received?: boolean | null
          push_new_application?: boolean | null
          push_offer_accepted?: boolean | null
          push_stage_changed?: boolean | null
          push_test_submitted?: boolean | null
          push_violation_detected?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_company: { Args: never; Returns: string }
      get_candidate_assessment: {
        Args: { _application_id: string; _type?: string }
        Returns: Json
      }
      get_job_aptitude_cutoff: { Args: { _job_id: string }; Returns: number }
      get_job_aptitude_questions: { Args: { _job_id: string }; Returns: Json }
      is_candidate_for_my_company: {
        Args: { _candidate_id: string }
        Returns: boolean
      }
      is_company_staff: { Args: never; Returns: boolean }
      is_hr_or_admin: { Args: never; Returns: boolean }
      match_candidates_for_job: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          candidate_user_id: string
          similarity: number
        }[]
      }
      match_jobs_for_candidate: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          company_id: string
          id: string
          similarity: number
          title: string
        }[]
      }
      owner_companies_full: {
        Args: never
        Returns: {
          about: string | null
          avg_response_days: number | null
          banner_url: string | null
          benefits: string[]
          company_code: string
          company_name: string
          company_size: string | null
          created_at: string
          founded_year: number | null
          id: string
          industry: string
          location: string
          logo_url: string | null
          office_photos: Json
          owner_id: string
          plan: string
          slug: string | null
          status: string
          tagline: string | null
          tech_stack: string[]
          updated_at: string
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      owner_company_codes: {
        Args: never
        Returns: {
          company_code: string
          id: string
        }[]
      }
      strip_answer_keys: { Args: { j: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
