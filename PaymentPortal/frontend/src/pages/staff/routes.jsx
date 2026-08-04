import { createBrowserRouter } from 'react-router-dom';
import StaffLayout from './StaffLayout.jsx';
import StaffLogin from './StaffLogin.jsx';
import StaffQueue from './StaffQueue.jsx';
import StaffPayment from './StaffPayment.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminUserDetail from './AdminUserDetail.jsx';

export const staffRouter = createBrowserRouter([
  { path: '/staff/login', element: <StaffLogin /> },
  {
    path: '/staff',
    element: <StaffLayout />, // guard inside
    children: [
      { index: true, element: <StaffQueue /> },
      { path: 'payments/:id', element: <StaffPayment /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'users/:id', element: <AdminUserDetail /> },
    ]
  }
]);
