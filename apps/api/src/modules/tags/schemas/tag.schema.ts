import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<TagModel>;

@Schema({ timestamps: true, collection: 'tags' })
export class TagModel {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, default: '#6161FF', match: /^#[0-9A-Fa-f]{6}$/ })
  color: string;
}

export const TagSchema = SchemaFactory.createForClass(TagModel);

TagSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
