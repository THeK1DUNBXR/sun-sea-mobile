import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';
import { field, text } from '@nozbe/watermelondb/decorators';
import type { AttachmentKind } from '../../api/types';

export default class Attachment extends Model {
  static table = 'attachments';
  static associations: Associations = {
    collections: { type: 'belongs_to', key: 'collection_id' },
  };

  @text('collection_id') collectionId: string;
  @text('kind') kind: AttachmentKind;
  @text('local_uri') localUri: string;
  @text('mime_type') mimeType: string;
  @text('remote_url') remoteUrl: string | null;
  @text('upload_error') uploadError: string | null;
  @field('created_at') createdAt: number;
}
