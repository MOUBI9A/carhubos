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
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Car compliance documents (Guardian Vault) — same fleet-asset domain as
 * `cars`/`accidents`, gated the same way: reads on `fleet.view`, mutations on
 * `fleet.manage` (AGENT holds `fleet.view` only, so it can see compliance
 * status but not create/renew/delete a legal document — was previously
 * ungated entirely, bare AuthGuard, letting any authenticated role delete a
 * car's insurance/registration record).
 */
@Controller('documents')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequireCapabilities('fleet.manage')
  create(@CurrentUser() user: any, @Body() dto: CreateCarDocumentDto) {
    return this.documentsService.create(user.agencyId, dto);
  }

  @Get()
  @RequireCapabilities('fleet.view')
  findAllForAgency(@CurrentUser() user: any) {
    return this.documentsService.findAllForAgency(user.agencyId);
  }

  @Get('car/:carId')
  @RequireCapabilities('fleet.view')
  findAllForCar(@CurrentUser() user: any, @Param('carId') carId: string) {
    return this.documentsService.findAllForCar(user.agencyId, carId);
  }

  @Patch(':id')
  @RequireCapabilities('fleet.manage')
  renew(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RenewCarDocumentDto,
  ) {
    return this.documentsService.renew(user.agencyId, id, dto);
  }

  @Delete(':id')
  @RequireCapabilities('fleet.manage')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documentsService.remove(user.agencyId, id);
  }
}
