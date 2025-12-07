import { fn } from 'storybook/test';

import DatasetExplorer from './DatasetExplorer.vue';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
export default {
  title: 'New/DatasetExplorer',
  component: DatasetExplorer,
  tags: ['autodocs'],
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary = {
  args: {
    primary: true,
    label: 'Data set',
  },
};
