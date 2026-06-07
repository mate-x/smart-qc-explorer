export interface DatasetValidateResponse {
  dataset_format: string;
  channels: 1 | 3;
  train_good_count: number;
  test_counts: Record<string, number>;
  defect_classes: string[];
  folder_tree: string;
  has_invalid_files: boolean;
  _invalid_file_count?: number;
}
