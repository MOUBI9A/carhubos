import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import {
  CreateCarDocumentDto,
  RenewCarDocumentDto,
} from './dto/documents.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCarDocumentDto) {
    return this.documentsService.create(user.agencyId, dto);
  }

  @Get()
  findAllForAgency(@CurrentUser() user: any) {
    return this.documentsService.findAllForAgency(user.agencyId);
  }

  @Get('car/:carId')
  findAllForCar(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.documentsService.findAllForCar(user.agencyId, carId);
  }

  @Patch(':id')
  renew(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RenewCarDocumentDto,
  ) {
    return this.documentsService.renew(user.agencyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documentsService.remove(user.agencyId, id);
  }
}
