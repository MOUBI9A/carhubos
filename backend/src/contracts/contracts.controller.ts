import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('generate/:bookingId')
  @UseGuards(AuthGuard)
  generate(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.contractsService.generate(user.agencyId, bookingId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id/sign')
  sign(@Param('id') id: string, @Body('signatureData') signatureData: string) {
    return this.contractsService.sign(id, signatureData);
  }
}
