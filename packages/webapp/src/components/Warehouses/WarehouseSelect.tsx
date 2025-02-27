// @ts-nocheck
import React from 'react';

import { MenuItem, Button } from '@blueprintjs/core';
import { FSelect } from '../Forms';

/**
 *
 * @param {*} query
 * @param {*} warehouse
 * @param {*} _index
 * @param {*} exactMatch
 * @returns
 */
const warehouseItemPredicate = (query, warehouse, _index, exactMatch) => {
  const normalizedTitle = warehouse.name.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return (
      `${warehouse.code}. ${normalizedTitle}`.indexOf(normalizedQuery) >= 0
    );
  }
};

/**
 *
 * @param {*} film
 * @param {*} param1
 * @returns
 */
const warehouseItemRenderer = (
  warehouse,
  { handleClick, modifiers, query },
) => {
  const text = `${warehouse.name}`;

  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      label={warehouse.code}
      key={warehouse.id}
      onClick={handleClick}
      text={text}
    />
  );
};

const warehouseSelectProps = {
  itemPredicate: warehouseItemPredicate,
  itemRenderer: warehouseItemRenderer,
  valueAccessor: 'id',
  labelAccessor: 'name',
};

/**
 *
 * @param {*} param0
 * @returns
 */
export function WarehouseSelect({ warehouses, ...rest }) {
  return <FSelect {...warehouseSelectProps} {...rest} items={warehouses} />;
}

/**
 *
 * @param {*} param0
 * @returns
 */
export function WarehouseSelectButton({ label, ...rest }) {
  return <Button text={label} />;
}
