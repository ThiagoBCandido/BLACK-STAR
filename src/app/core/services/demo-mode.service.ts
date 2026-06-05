import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DemoModeService {
    readonly isDemoMode = signal(localStorage.getItem('blackstar_demo_mode') === 'true');
    enableDemoMode(): void{
        localStorage.setItem('blackstar_demo_mode', 'true');
        this.isDemoMode.set(true);
    }

    disableDemoMode(): void{
        localStorage.removeItem('blackstar_demo_mode');
        this.isDemoMode.set(false);
    }
}