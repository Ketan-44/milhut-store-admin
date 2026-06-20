import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../services/auth.service';
import { AuthService } from 'src/app/theme/shared/services/auth.service';

@Component({
  selector: 'app-auth-login',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './auth-login.component.html',
  styleUrl: './auth-login.component.scss',
})
export class AuthLoginComponent {
  private fb = inject(FormBuilder);

  authenticationService = inject(AuthenticationService);
  authService = inject(AuthService);
  router = inject(Router);
  private toastr = inject(ToastrService);

  loggingIn = false;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submitted = false;

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials = this.loginForm.getRawValue();

    this.loggingIn = true;

    this.authenticationService.login(credentials).subscribe({
      next: (response) => {
        this.loggingIn = false;
        this.authService.storeToken(response.data);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loggingIn = false;
        const message = error.message ?? 'Login failed. Please try again.';
        this.toastr.error(message, 'Error');
      },
    });
  }
}