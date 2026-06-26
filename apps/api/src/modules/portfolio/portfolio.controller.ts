import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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

  @Patch(':id/contacts')
  updateContacts(
    @Param('id') id: string,
    @Body() body: { contacts: import('@geveze/shared').CompanyContact[] },
  ): Promise<PortfolioCompany> {
    return this.portfolioService.updateField(id, 'contacts', body.contacts);
  }

  @Patch(':id/social-media')
  updateSocialMedia(
    @Param('id') id: string,
    @Body() body: { accounts: import('@geveze/shared').SocialMediaAccount[] },
  ): Promise<PortfolioCompany> {
    return this.portfolioService.updateField(id, 'socialMediaAccounts', body.accounts);
  }

  @Patch(':id/brand')
  updateBrand(
    @Param('id') id: string,
    @Body() body: { brandIdentity: import('@geveze/shared').BrandIdentity },
  ): Promise<PortfolioCompany> {
    return this.portfolioService.updateField(id, 'brandIdentity', body.brandIdentity);
  }

  @Patch(':id/calendar')
  updateCalendar(
    @Param('id') id: string,
    @Body() body: { calendar: import('@geveze/shared').ContentCalendarItem[] },
  ): Promise<PortfolioCompany> {
    return this.portfolioService.updateField(id, 'monthlyContentCalendar', body.calendar);
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id') id: string,
    @Body() body: { notes: string[] },
  ): Promise<PortfolioCompany> {
    return this.portfolioService.updateField(id, 'notes', body.notes);
  }
}
