import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { ContractsService } from './contracts.service';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';

class SignContractDto {
  @IsString()
  @MinLength(1)
  signatureData!: string;
}

@Controller('contracts')
@UseGuards(AuthGuard, CapabilitiesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('generate/:bookingId')
  @RequireCapabilities('contract.manage')
  generate(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.contractsService.generate(user.agencyId, bookingId);
  }

  @Get(':id')
  @RequireCapabilities('contract.manage')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contractsService.findOne(user.agencyId, id);
  }

  @Patch(':id/sign')
  @RequireCapabilities('contract.sign')
  sign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.contractsService.sign(user.agencyId, id, dto.signatureData);
  }
}
