import { Component, inject, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { Role } from 'src/app/theme/shared/enums/role.enum';
import { AuthService } from 'src/app/theme/shared/services/auth.service';
import { UserProfileModalService } from 'src/app/theme/shared/services/user-profile-modal.service';

import { IconService } from '@ant-design/icons-angular';
import {
  LogoutOutline,
  UserOutline,
} from '@ant-design/icons-angular/icons';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule, RouterModule, TitleCasePipe],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
})
export class NavRightComponent {
  private iconService = inject(IconService);
  private authService = inject(AuthService);
  private profileModalService = inject(UserProfileModalService);
  private router = inject(Router);

  user = this.authService.user;

  styleSelectorToggle = input<boolean>();
  readonly Customize = output();
  windowWidth: number;
  screenFull: boolean = true;
  direction: string = 'ltr';

  constructor() {
    this.windowWidth = window.innerWidth;
    this.iconService.addIcon(LogoutOutline, UserOutline);
  }

  getRoleName(role?: number): string {
    if (role === undefined) {
      return 'User';
    }

    return Object.entries(Role).find((entry) => entry[1] === role)?.[0] ?? 'User';
  }

  openProfile(): void {
    this.profileModalService.open();
  }

  logout(): void {
    this.authService.clearSession();
    this.router.navigate(['/login']);
  }
}
