terraform {
  backend "s3" {
    bucket         = "sunsets-terraform-state"
    key            = "terraform.tfstate"
    region         = "eu-north-1"
    encrypt        = true
    # Dynamodb table for locking (optional but recommended)
    # dynamodb_table = "sunsets-terraform-locks"
  }
}
