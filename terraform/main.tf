terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

variable "hcloud_ssh_key_path" {
  description = "Path to the public SSH key"
  default     = "~/.ssh/id_rsa.pub"
}

variable "hcloud_ssh_public_key" {
  description = "The actual public SSH key content (optional, overrides hcloud_ssh_key_path)"
  type        = string
  default     = ""
}

variable "hcloud_server_type" {
  description = "Hetzner server type"
  default     = "cx22"
}

variable "hcloud_location" {
  description = "Hetzner datacenter location"
  default     = "nbg1"
}

variable "aws_region" {
  description = "AWS Region"
  default     = "eu-north-1"
}

provider "hcloud" {
  # Automatically uses HCLOUD_TOKEN environment variable
}

provider "aws" {
  region = var.aws_region
  # Automatically uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
  # or ~/.aws/credentials
}

# --- AWS S3 & IAM ---
resource "aws_s3_bucket" "sunsets" {
  bucket = "sunsets-terraform"
}

resource "aws_iam_user" "backend" {
  name = "sunsets-backend-user"
}

resource "aws_iam_access_key" "backend" {
  user = aws_iam_user.backend.name
}

resource "aws_iam_user_policy" "backend_s3" {
  name = "sunsets-s3-policy"
  user = aws_iam_user.backend.name

  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource":"${aws_s3_bucket.sunsets.arn}" 
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource":"${aws_s3_bucket.sunsets.arn}/*" 
        }
    ]
  })
}

# --- Secrets Manager ---
resource "aws_secretsmanager_secret" "backend_config" {
  name = "sunsets/backend-config"
  recovery_window_in_days = 0 # For development/testing
}

resource "aws_secretsmanager_secret_version" "backend_config" {
  secret_id     = aws_secretsmanager_secret.backend_config.id
  secret_string = jsonencode({
    AWS_ACCESSKEYID     = aws_iam_access_key.backend.id
    AWS_SECRETACCESSKEY = aws_iam_access_key.backend.secret
    AWS_BUCKET_NAME     = aws_s3_bucket.sunsets.bucket
    AWS_REGION          = var.aws_region
    DATABASE_URL        = "postgres://user:password@host:5432/dbname" # Placeholder
  })
}

# --- Hetzner Infrastructure ---
resource "hcloud_ssh_key" "default" {
  name       = "ajsth-ssh-key"
  public_key = var.hcloud_ssh_public_key != "" ? var.hcloud_ssh_public_key : file(var.hcloud_ssh_key_path)
}

resource "hcloud_firewall" "web" {
  name = "web-firewall"
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0"]
  }
}

resource "hcloud_server" "sunsets_vps" {
  name         = "sunsets-vps"
  image        = "ubuntu-24.04"
  server_type  = var.hcloud_server_type
  location     = var.hcloud_location
  ssh_keys     = [hcloud_ssh_key.default.id]
  firewall_ids = [hcloud_firewall.web.id]

  # Provisioning script to install Docker
  user_data = <<-EOT
    #cloud-config
    runcmd:
      - apt-get update
      - apt-get install -y docker.io docker-compose git
      - systemctl start docker
      - systemctl enable docker
  EOT
}

output "vps_ip" {
  value = hcloud_server.sunsets_vps.ipv4_address
}

output "config_secret_name" {
  value = aws_secretsmanager_secret.backend_config.name
}
