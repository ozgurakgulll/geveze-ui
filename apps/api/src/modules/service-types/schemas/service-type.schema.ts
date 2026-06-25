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
  transform: (_doc, ret: Record<string, unknown>) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
