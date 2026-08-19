import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './App'
import { HomePage } from './pages/HomePage'
import { GroupsListPage } from './pages/GroupsListPage'
import { NewGroupPage } from './pages/NewGroupPage'
import { GroupDetailPage } from './pages/GroupDetailPage'
import { ProfilePage } from './pages/ProfilePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'groups', element: <GroupsListPage /> },
      { path: 'groups/new', element: <NewGroupPage /> },
      { path: 'groups/:groupId', element: <GroupDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
