import { Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Role } from '../../enums/role.enum';
import { AuthService } from '../../services/auth.service';
import { UserProfileModalService } from '../../services/user-profile-modal.service';

@Component({
  selector: 'app-user-profile-modal',
  imports: [TitleCasePipe],
  templateUrl: './user-profile-modal.component.html',
  styleUrl: './user-profile-modal.component.scss',
})
export class UserProfileModalComponent {
  private authService = inject(AuthService);
  private profileModalService = inject(UserProfileModalService);

  user = this.authService.user;

  getRoleName(role?: number): string {
    if (role === undefined) {
      return 'User';
    }

    return Object.entries(Role).find((entry) => entry[1] === role)?.[0] ?? 'User';
  }

  close(): void {
    this.profileModalService.close();
  }
}
