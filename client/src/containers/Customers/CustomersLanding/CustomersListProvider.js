import React, { createContext } from 'react';

import DashboardInsider from 'components/Dashboard/DashboardInsider';
import { useResourceViews, useCustomers } from 'hooks/query';
import { isTableEmptyStatus } from 'utils';

const CustomersListContext = createContext();

function CustomersListProvider({ query, ...props }) {
  // Fetch customers resource views and fields.
  const {
    data: customersViews,
    isLoading: isCustomersViewsLoading,
  } = useResourceViews('customers');

  // Fetches customers data with pagination meta.
  const {
    data: { customers, pagination, filterMeta },
    isLoading: isCustomersLoading,
    isFetching: isCustomersFetching,
  } = useCustomers(query, { keepPreviousData: true });

  // Detarmines the datatable empty status.
  const isEmptyStatus = isTableEmptyStatus({
    data: customers, pagination, filterMeta,
  }) && !isCustomersFetching;

  const state = {
    customersViews,
    customers,
    pagination,

    isCustomersViewsLoading,
    isCustomersLoading,
    isCustomersFetching,

    isEmptyStatus,
  };

  return (
    <DashboardInsider loading={isCustomersViewsLoading} name={'customers-list'}>
      <CustomersListContext.Provider value={state} {...props} />
    </DashboardInsider>
  );
}

const useCustomersListContext = () => React.useContext(CustomersListContext);

export { CustomersListProvider, useCustomersListContext };