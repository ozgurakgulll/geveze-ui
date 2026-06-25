import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({ timestamps: true, collection: 'users' })
export class UserModel {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  avatar?: string;

  @Prop({ required: true, maxlength: 3, trim: true })
  initials: string;

  @Prop({ required: true, match: /^#[0-9A-Fa-f]{6}$/ })
  color: string;

  @Prop({ trim: true })
  title?: string;

  @Prop({ required: true, default: 'member', enum: ['admin', 'manager', 'member'] })
  role: string;

  /** select: false → API yanıtlarına dahil edilmez */
  @Prop({ select: false })
  passwordHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

UserSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    delete ret['passwordHash'];
    return ret;
  },
});
