import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceTypeDocument = HydratedDocument<ServiceTypeModel>;

@Schema({ timestamps: true, collection: 'service_types' })
export class ServiceTypeModel {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const ServiceTypeSchema = SchemaFactory.createForClass(ServiceTypeModel);

ServiceTypeSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
