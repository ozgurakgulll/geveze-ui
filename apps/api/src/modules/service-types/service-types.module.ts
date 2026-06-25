import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceTypeModel, ServiceTypeSchema } from './schemas/service-type.schema';
import { ServiceTypesService } from './service-types.service';
import { ServiceTypesController } from './service-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ServiceTypeModel.name, schema: ServiceTypeSchema }]),
  ],
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
  exports: [ServiceTypesService],
})
export class ServiceTypesModule {}
