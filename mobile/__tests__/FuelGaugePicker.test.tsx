import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { FuelGaugePicker } from '../src/components/inspection/FuelGaugePicker';

describe('FuelGaugePicker Component Suite', () => {
  it('renders correctly with 4/8 (half tank) selected', () => {
    const onChange = jest.fn();
    const tree = renderer
      .create(<FuelGaugePicker value={4} onChange={onChange} />)
      .toJSON();

    expect(tree).toBeDefined();
  });

  it('triggers onChange callback when a gauge segment is pressed', () => {
    const onChange = jest.fn();
    const component = renderer.create(
      <FuelGaugePicker value={2} onChange={onChange} />
    );
    const root = component.root;

    // Find pressable segments
    const pressableNodes = root.findAll((node: any) => typeof node.props.onPress === 'function');
    expect(pressableNodes.length).toBeGreaterThanOrEqual(9);

    // Press last segment (index 8 / Full tank)
    act(() => {
      pressableNodes[pressableNodes.length - 1].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith(8);
  });
});
