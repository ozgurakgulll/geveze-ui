import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioCompanyDto, UpdatePortfolioCompanyDto } from './dto/create-portfolio-company.dto';
import type { PortfolioCompany } from '@geveze/shared';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll(): Promise<PortfolioCompany[]> {
    return this.portfolioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PortfolioCompany> {
    return this.portfolioService.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePortfolioCompanyDto): Promise<PortfolioCompany> {
    return this.portfolioService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioCompanyDto,
  ): Promise<PortfolioCompany> {
    return this.portfolioService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.portfolioService.remove(id);
  }
}
