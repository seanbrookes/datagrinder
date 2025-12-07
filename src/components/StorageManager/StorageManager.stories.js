import { fn } from 'storybook/test';

import StorageManager from './StorageManager.vue';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
export default {
  title: 'New/StorageManager',
  component: StorageManager,
  tags: ['autodocs'],
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary = {
  args: {
    primary: true,
    label: 'Data set',
  },
};
