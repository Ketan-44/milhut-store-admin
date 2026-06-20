import { Component, effect, inject, resource } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { InventoryService } from '../services/inventory.service';
import {
  optionalExpiryDateValidators,
  getTodayDateString,
} from 'src/app/theme/shared/utils/date.util';

@Component({
  selector: 'app-inventory-edit',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './inventory-edit.component.html',
  styleUrl: './inventory-edit.component.scss',
})
export class InventoryEditComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  private readonly batchId = this.route.snapshot.paramMap.get('id');

  batchResource = resource({
    loader: async () => {
      if (!this.batchId) {
        throw new Error('Batch id is missing.');
      }

      const response = await firstValueFrom(
        this.inventoryService.getById(this.batchId),
      );

      return response.data;
    },
  });

  saving = false;
  submitted = false;
  errorMessage = '';
  readonly minExpiryDate = getTodayDateString();

  inventoryForm = this.fb.nonNullable.group({
    expiryDate: ['', optionalExpiryDateValidators(this.minExpiryDate)],
    sourceName: ['', Validators.maxLength(200)],
  });

  constructor() {
    effect(() => {
      const data = this.batchResource.value();

      if (!data) {
        return;
      }

      this.inventoryForm.patchValue(
        {
          expiryDate: data.batch.expiryDate?.slice(0, 10) ?? '',
          sourceName: data.batch.sourceName ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  get f() {
    return this.inventoryForm.controls;
  }

  get loadErrorMessage(): string {
    const error = this.batchResource.error();

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to load batch.';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.batchId || this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    const { expiryDate, sourceName } = this.inventoryForm.getRawValue();
    const payload = {
      expiryDate: expiryDate || null,
      sourceName: sourceName.trim() || null,
    };

    this.inventoryService.update(this.batchId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Batch updated successfully.', 'Success');
        this.router.navigate(['/inventory']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to update batch.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
