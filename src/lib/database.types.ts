// Public RPC contract maintained alongside the versioned SQL migrations.
// Private schemas and auth mappings are intentionally absent from application types.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Rpc<A, R> = { Args: A; Returns: R };
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      my_rooms: Rpc<Record<string, never>, Json>;
      room_create: Rpc<{ p_name: string }, string>;
      room_join: Rpc<{ p_code: string }, string>;
      room_leave: Rpc<{ p_room_id: string }, undefined>;
      room_key: Rpc<{ p_room_id: string }, Json>;
      room_key_manage: Rpc<{ p_room_id: string; p_action: string; p_label: string; p_days: number }, Json>;
      room_feed: Rpc<{ p_room_id: string; p_sort?: string; p_category?: string | null; p_page?: number }, Json>;
      room_post: Rpc<{ p_room_id: string; p_id: string }, Json>;
      room_comments: Rpc<{ p_room_id: string; p_post_id: string; p_page?: number }, Json>;
      room_reports: Rpc<{ p_room_id: string; p_page?: number }, Json>;
      room_create_post: Rpc<{ p_room_id: string; p_content: string; p_category: string; p_options?: string[] | null }, string>;
      room_edit_post: Rpc<{ p_room_id: string; p_id: string; p_content: string; p_category: string }, undefined>;
      room_delete_post: Rpc<{ p_room_id: string; p_id: string }, undefined>;
      room_add_comment: Rpc<{ p_room_id: string; p_post_id: string; p_content: string }, string>;
      room_edit_comment: Rpc<{ p_room_id: string; p_id: string; p_content: string }, undefined>;
      room_delete_comment: Rpc<{ p_room_id: string; p_id: string }, undefined>;
      room_set_reaction: Rpc<{ p_room_id: string; p_post_id: string; p_kind: string | null }, undefined>;
      room_vote_poll: Rpc<{ p_room_id: string; p_poll_id: string; p_option_id: string }, undefined>;
      room_report_post: Rpc<{ p_room_id: string; p_post_id: string; p_reason: string }, undefined>;
      room_moderate_report: Rpc<{ p_room_id: string; p_report_id: string; p_action: string }, undefined>;
      // Legacy contracts only for historical tests/scripts; revoked by migration 004.
      my_membership: Rpc<Record<string, never>, Json>;
      join_office: Rpc<{ p_code: string }, Json>;
      get_feed: Rpc<{ p_sort?: string; p_category?: string | null; p_page?: number }, Json>;
      get_post: Rpc<{ p_id: string }, Json>;
      get_comments: Rpc<{ p_post_id: string; p_page?: number }, Json>;
      get_reports: Rpc<{ p_page?: number }, Json>;
      create_post: Rpc<{ p_content: string; p_category: string; p_options?: string[] | null }, string>;
      edit_post: Rpc<{ p_id: string; p_content: string; p_category: string }, undefined>;
      delete_post: Rpc<{ p_id: string }, undefined>;
      add_comment: Rpc<{ p_post_id: string; p_content: string }, string>;
      edit_comment: Rpc<{ p_id: string; p_content: string }, undefined>;
      delete_comment: Rpc<{ p_id: string }, undefined>;
      set_reaction: Rpc<{ p_post_id: string; p_kind: string | null }, undefined>;
      vote_poll: Rpc<{ p_poll_id: string; p_option_id: string }, undefined>;
      report_post: Rpc<{ p_post_id: string; p_reason: string }, undefined>;
      moderate_report: Rpc<{ p_report_id: string; p_action: string }, undefined>;
      operator_create_invite: Rpc<{ p_hash: string; p_label: string; p_max_uses: number; p_expires_at: string }, string>;
      operator_set_admin: Rpc<{ p_user_id: string; p_admin: boolean }, undefined>;
      operator_revoke_invite: Rpc<{ p_id: string }, undefined>;
    };
  };
};