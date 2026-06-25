import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<TagModel>;

@Schema({ timestamps: true, collection: 'tags' })
export class TagModel {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const TagSchema = SchemaFactory.createForClass(TagModel);

TagSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
