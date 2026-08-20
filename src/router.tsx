import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './App'
import { HomePage } from './pages/HomePage'
import { GroupsListPage } from './pages/GroupsListPage'
import { NewGroupPage } from './pages/NewGroupPage'
import { GroupDetailPage } from './pages/GroupDetailPage'
import { ActivityPage } from './pages/ActivityPage'
import { ProfilePage } from './pages/ProfilePage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'groups', element: <GroupsListPage /> },
        { path: 'groups/new', element: <NewGroupPage /> },
        { path: 'groups/:groupId', element: <GroupDetailPage /> },
        { path: 'activity', element: <ActivityPage /> },
        { path: 'profile', element: <ProfilePage /> },
      ],
    },
  ],
  // Matches vite.config.ts's `base` — GitHub Pages serves this app from
  // /split/, not the domain root.
  { basename: import.meta.env.BASE_URL }
)
