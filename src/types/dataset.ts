export interface DatasetValidateResponse {
  dataset_format: string;             // "mvtec" | "oking"
  channels: 1 | 3;
  train_good_count: number;
  test_counts: Record<string, number>;
  gt_counts: Record<string, number>;
  total_test_count: number;
  defect_classes: string[];
  supported_formats: string[];
  has_invalid_files: boolean;
  invalid_file_count: number;
  folder_tree: string;
  available_bg_methods: string[];
  // OK/NG 전용
  oking_ok_dir?: string | null;
  oking_ng_dir?: string | null;
  oking_ok_count?: number | null;
  oking_ng_count?: number | null;
  train_ratio?: number | null;
}
