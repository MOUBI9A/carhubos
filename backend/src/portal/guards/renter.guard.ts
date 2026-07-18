import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Gate for the renter self-service portal. Runs AFTER AuthGuard, so `req.user`
 * is populated (`{ ...payload, id: sub, role, agencyId }`).
 *
 * Only a RENTER identity (or ROOT_ADMIN, for platform support) may enter the
 * portal. This guard decides WHO may call a portal handler; the actual
 * self-scoping — that a renter only ever sees their OWN rows — is enforced in
 * the service by keying every query on `req.user.id`. There is no path here
 * that trusts a body/param id, so cross-user access is impossible.
 */
@Injectable()
export class RenterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role === 'RENTER' || user.role === 'ROOT_ADMIN') {
      return true;
    }
    throw new ForbiddenException('Renter portal is self-service only.');
  }
}
