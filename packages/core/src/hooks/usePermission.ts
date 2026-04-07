import { useAppContext } from '@core/contexts/AppContext';

export const usePermission = () => {
    const { currentUser } = useAppContext();
    const role = currentUser?.role;

    return {
        isAdmin:          role === 'admin',
        isStaff:          role === 'staff',
        isRequester:      role === 'requester',
        canApprove:       role === 'admin' || role === 'staff',
        canDelete:        role === 'admin' || role === 'staff',
        canManageBrand:   role === 'admin',
        canManageAccount: role === 'admin',
    };
};
