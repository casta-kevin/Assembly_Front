import { Routes } from '@angular/router';

import { provideAuthFeature } from './features/auth/auth.providers';
import { LoginComponent } from './features/auth/presentation/login/login.component';
import { provideAssembliesFeature } from './features/admin/assemblies/assemblies.providers';
import { AssembliesListComponent } from './features/admin/assemblies/presentation/list/assemblies-list.component';
import { AssemblyFormComponent } from './features/admin/assemblies/presentation/form/assembly-form.component';
import { TopicQuestionsComponent } from './features/admin/assemblies/presentation/questions/topic-questions.component';
import { AssemblyParticipantsComponent } from './features/admin/assemblies/presentation/participants/assembly-participants.component';
import { AssemblyLiveConsoleComponent } from './features/admin/assemblies/presentation/live/assembly-live-console.component';
import { AssemblyDetailComponent } from './features/admin/assemblies/presentation/detail/assembly-detail.component';
import { AssemblyAuditComponent } from './features/admin/assemblies/presentation/audit/assembly-audit.component';
import { AssemblyFilesComponent } from './features/admin/assemblies/presentation/files/assembly-files.component';
import { provideResidentAssembliesFeature } from './features/resident/assemblies/assemblies.providers';
import { ResidentNotificationsComponent } from './features/resident/assemblies/presentation/notifications/resident-notifications.component';
import { ResidentAssembliesListComponent } from './features/resident/assemblies/presentation/list/resident-assemblies-list.component';
import { ResidentAssemblyDetailComponent } from './features/resident/assemblies/presentation/detail/resident-assembly-detail.component';
import { ResidentLiveVoteComponent } from './features/resident/assemblies/presentation/live/resident-live-vote.component';

export const routes: Routes = [
	{
		path: '',
		component: LoginComponent,
		providers: [...provideAuthFeature()],
	},
	{
		path: 'admin',
		children: [
			{
				path: 'assemblies',
				providers: [...provideAssembliesFeature()],
				children: [
					{
						path: '',
						component: AssembliesListComponent,
					},
					{
						path: 'new',
						component: AssemblyFormComponent,
					},
					{
						path: ':id/questions/:topicId',
						component: TopicQuestionsComponent,
					},
					{
						path: ':id/participants',
						component: AssemblyParticipantsComponent,
					},
					{
						path: ':id/live',
						component: AssemblyLiveConsoleComponent,
					},
					{
						path: ':id/history',
						component: AssemblyDetailComponent,
					},
					{
						path: ':id/audit',
						component: AssemblyAuditComponent,
					},
					{
						path: ':id/files',
						component: AssemblyFilesComponent,
					},
					{
						path: ':id',
						component: AssemblyFormComponent,
					},
				],
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'assemblies',
			},
		],
	},
	{
		path: 'resident',
		providers: [...provideResidentAssembliesFeature()],
		children: [
			{
				path: 'notifications',
				component: ResidentNotificationsComponent,
			},
			{
				path: 'assemblies',
				component: ResidentAssembliesListComponent,
			},
			{
				path: 'assemblies/:id/live',
				component: ResidentLiveVoteComponent,
			},
			{
				path: 'assemblies/:id',
				component: ResidentAssemblyDetailComponent,
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'notifications',
			},
		],
	},
	{
		path: '**',
		redirectTo: '',
		pathMatch: 'full',
	},
];
