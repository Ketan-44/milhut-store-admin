import { Component, inject, OnInit, resource } from '@angular/core';
import { UserService } from '../services/user.service';
import { firstValueFrom } from 'rxjs';
import { NgClass, TitleCasePipe } from '@angular/common';
import { Role } from 'src/app/theme/shared/enums/role.enum';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [NgClass, TitleCasePipe]
})
export class UserListComponent implements OnInit {

  userService = inject(UserService);
  userResource = resource({
    loader: async () => {
      const response = await firstValueFrom(
        this.userService.get()
      );

      return response.data;
    },
  });

  ngOnInit() {
  }

  getRole(role: number) {
    return Object.entries(Role).find((x) => x[1] === role)![0];
  }

}
