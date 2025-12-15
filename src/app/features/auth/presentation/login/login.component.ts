import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { AuthSessionService } from '../../application/services/auth-session.service';

type LoginFormValue = {
  email: string;
  password: string;
  rememberMe: boolean;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);
  private readonly sessionService = inject(AuthSessionService);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [true],
  });

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected readonly passwordInputType = computed(() => (this.passwordVisible() ? 'text' : 'password'));

  protected submitDisabled(): boolean {
    return this.isLoading() || this.loginForm.invalid;
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((current) => !current);
  }

  protected submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, rememberMe } = this.loginForm.getRawValue();

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.loginUseCase
      .execute({ email, password, rememberMe })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (session) => {
          this.sessionService.setSession(session, rememberMe);
          this.successMessage.set(`Hola ${session.user.name}, tu sesión está activa.`);
          void this.router.navigate(this.resolveLandingRoute(session.roleId));
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible iniciar sesión. Inténtalo de nuevo.';
          this.errorMessage.set(message);
        },
      });
  }

  protected controlInvalid(controlName: keyof LoginFormValue): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private resolveLandingRoute(roleId: string | undefined): string[] {
    const normalized = (roleId ?? '').trim().toUpperCase();
    if (!normalized) {
      return ['/'];
    }

    switch (true) {
      case normalized === 'ADMN' || normalized.includes('ADMIN'):
        return ['/admin', 'assemblies'];
      case normalized === 'RSDT' || normalized.includes('RESIDENT') || normalized.includes('VECINO'):
        return ['/resident', 'notifications'];
      default:
        return ['/'];
    }
  }
}
