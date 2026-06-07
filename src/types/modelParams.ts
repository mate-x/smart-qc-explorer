export interface EfficientAdParamsState {
  model_size: 'small' | 'medium';
  train_steps: number;
  optimizer: 'adam' | 'adamw' | 'sgd';
  learning_rate: number;
  weight_decay: number;
  out_channels: 128 | 256 | 384 | 512;
  padding: boolean;
  ae_loss_weight: number;
  autoencoder_lr: number;
  autoencoder_weight_decay: number;
  lr_decay_epochs: number;
  lr_decay_factor: number;
  scheduler: 'StepLR' | 'CosineAnnealingLR';
  use_imagenet_penalty: boolean;
  penalty_batch_size: number;
  early_stopping: boolean;
  patience: number;
  min_delta: number;
}

export interface PatchCoreParamsState {
  backbone: 'wide_resnet50_2' | 'resnet18' | 'resnet50';
  pretrained_source: 'torchvision' | 'local';
  pretrained_path: string | null;
  coreset_sampling_ratio: number;
  neighbourhood_kernel_size: 1 | 3 | 5 | 7 | 9;
  max_train: number;
  knn: number;
  top_k_ratio: number;
}
