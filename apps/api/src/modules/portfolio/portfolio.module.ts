import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioCompanyModel, PortfolioCompanySchema } from './schemas/portfolio-company.schema';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PortfolioCompanyModel.name, schema: PortfolioCompanySchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
