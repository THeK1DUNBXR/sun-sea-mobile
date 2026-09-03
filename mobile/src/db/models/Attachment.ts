import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';
import type { AttachmentKind } from '../../api/types';

export type AttachmentParent = 'collection' | 'handover' | 'expense' | 'lead';

export default class Attachment extends Model {
  static table = 'attachments';
  static associations: Associations = {
    collections: { type: 'belongs_to', key: 'collection_id' },
  };

  /** Id of the owning record (collection / handover / expense / lead). Column kept as collection_id for v1 compatibility. */
  @text('collection_id') collectionId: string;
  @text('parent_type') parentType: AttachmentParent;
  @text('kind') kind: AttachmentKind;
  @text('local_uri') localUri: string;
  @text('mime_type') mimeType: string;
  @text('remote_url') remoteUrl: string | null;
  @text('upload_error') uploadError: string | null;
  @field('created_at') createdAt: number;
}
