import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingDocument = HydratedDocument<SettingModel>;

/** key-value ayar deposu: tableColumnSchema, tagServiceMap vb. */
@Schema({ timestamps: true, collection: 'settings' })
export class SettingModel {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object })
  value: unknown;
}

export const SettingSchema = SchemaFactory.createForClass(SettingModel);

SettingSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
