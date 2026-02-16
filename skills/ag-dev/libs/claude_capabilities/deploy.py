"""
Deployment engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 6 - Dry-Run (preview before deploy)
  Auto-deploy to Cloudflare Pages

Usage:
  from claude_capabilities.deploy import deploy_page, preview_deployment

  # Deploy single HTML file
  result = deploy_page(
      html_content="<html>...</html>",
      project_name="my-landing",
  )

  # Deploy directory
  result = deploy_page(
      directory="output/my-landing/",
      project_name="my-landing",
  )
"""

import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

from claude_capabilities.cost import CostTracker
from claude_capabilities.keys import get_optional

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# CLOUDFLARE PAGES CONFIGURATION
# Free tier: unlimited sites, 500 builds/month, 25 MB max per file
# ═══════════════════════════════════════════════════════════════════

CLOUDFLARE_CONFIG = {
    "max_file_size": 25 * 1024 * 1024,  # 25 MB
    "free_builds_per_month": 500,
    "default_branch": "main",
    "subdomain_suffix": ".pages.dev",
}


def _get_cloudflare_account_id() -> Optional[str]:
    """Get Cloudflare account ID from API."""
    api_token = get_optional("CLOUDFLARE_API_TOKEN")
    if not api_token:
        return None
    
    url = "https://api.cloudflare.com/client/v4/accounts"
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        
        accounts = data.get("result", [])
        if accounts:
            return accounts[0].get("id")
    except Exception as e:
        print(f"[deploy.py] Failed to get account ID: {e}")
    
    return None


def _create_pages_project(account_id: str, project_name: str) -> bool:
    """Create a new Cloudflare Pages project if it doesn't exist."""
    api_token = get_optional("CLOUDFLARE_API_TOKEN")
    if not api_token:
        return False
    
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects"
    
    payload = {
        "name": project_name,
        "production_branch": "main",
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data.get("success", False)
    except urllib.error.HTTPError as e:
        # 409 = project already exists (ok)
        if e.code == 409:
            return True
        print(f"[deploy.py] Failed to create project: {e}")
    except Exception as e:
        print(f"[deploy.py] Failed to create project: {e}")
    
    return False


def _deploy_with_wrangler(directory: str, project_name: str) -> Optional[str]:
    """
    Deploy using Wrangler CLI (most reliable method).
    
    Requires: npm install -g wrangler
    """
    api_token = get_optional("CLOUDFLARE_API_TOKEN")
    if not api_token:
        return None
    
    try:
        # Set env for wrangler
        env = os.environ.copy()
        env["CLOUDFLARE_API_TOKEN"] = api_token
        
        result = subprocess.run(
            ["wrangler", "pages", "deploy", directory, "--project-name", project_name],
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )
        
        if result.returncode == 0:
            # Parse URL from output
            output = result.stdout
            
            # Look for the deployment URL
            for line in output.split("\n"):
                if ".pages.dev" in line:
                    # Extract URL
                    url = line.strip()
                    if url.startswith("http"):
                        return url
                    elif "pages.dev" in url:
                        return f"https://{project_name}.pages.dev"
            
            # Default URL if not found in output
            return f"https://{project_name}.pages.dev"
        else:
            print(f"[deploy.py] Wrangler error: {result.stderr}")
    except FileNotFoundError:
        print("[deploy.py] Wrangler CLI not found. Install with: npm install -g wrangler")
    except Exception as e:
        print(f"[deploy.py] Wrangler error: {e}")
    
    return None


def preview_deployment(
    html_content: Optional[str] = None,
    directory: Optional[str] = None,
    project_name: str = "my-landing",
) -> dict:
    """
    Pilar 6: Preview deployment without actually deploying.
    
    Args:
        html_content: HTML string to deploy
        directory: Directory to deploy
        project_name: Name for the Pages project
    
    Returns:
        dict with: files, size, url_preview, estimated_time
    """
    files = []
    total_size = 0
    
    if html_content:
        size = len(html_content.encode())
        files.append({"name": "index.html", "size": size})
        total_size = size
    elif directory and Path(directory).is_dir():
        for file_path in Path(directory).rglob("*"):
            if file_path.is_file():
                size = file_path.stat().st_size
                files.append({
                    "name": str(file_path.relative_to(directory)),
                    "size": size,
                })
                total_size += size
    
    # Validate
    errors = []
    for f in files:
        if f["size"] > CLOUDFLARE_CONFIG["max_file_size"]:
            errors.append(f"File too large: {f['name']} ({f['size']} bytes)")
    
    # Sanitize project name
    safe_name = project_name.lower().replace("_", "-").replace(" ", "-")
    safe_name = "".join(c for c in safe_name if c.isalnum() or c == "-")
    
    return {
        "project_name": safe_name,
        "url_preview": f"https://{safe_name}.pages.dev",
        "files": files[:10],  # Show first 10
        "total_files": len(files),
        "total_size_bytes": total_size,
        "total_size_human": f"{total_size / 1024:.1f} KB",
        "errors": errors,
        "cost": 0.00,  # Cloudflare Pages is free
        "estimated_deploy_time": "30-60 seconds",
    }


def deploy_page(
    html_content: Optional[str] = None,
    directory: Optional[str] = None,
    project_name: str = "my-landing",
    dry_run: bool = False,
) -> dict:
    """
    Deploy HTML or directory to Cloudflare Pages.
    
    Args:
        html_content: HTML string to deploy (creates index.html)
        directory: Directory to deploy (all files)
        project_name: Name for the Pages project
        dry_run: If True, only returns preview
    
    Returns:
        dict with: url, project_name, files_deployed, time
    """
    # Sanitize project name
    safe_name = project_name.lower().replace("_", "-").replace(" ", "-")
    safe_name = "".join(c for c in safe_name if c.isalnum() or c == "-")
    
    if dry_run:
        return preview_deployment(html_content, directory, safe_name)
    
    # Create temp directory if deploying HTML content
    temp_dir = None
    deploy_dir = directory
    
    if html_content:
        temp_dir = tempfile.mkdtemp()
        deploy_dir = temp_dir
        
        # Write index.html
        with open(os.path.join(temp_dir, "index.html"), "w") as f:
            f.write(html_content)
    
    if not deploy_dir or not Path(deploy_dir).is_dir():
        return {"error": "No content to deploy", "url": None}
    
    try:
        # Deploy with Wrangler
        url = _deploy_with_wrangler(deploy_dir, safe_name)
        
        if url:
            # Track (free!)
            tracker.add_custom("cloudflare_pages", 0.0)
            
            return {
                "url": url,
                "project_name": safe_name,
                "provider": "cloudflare_pages",
                "cost": 0.00,
            }
        else:
            return {"error": "Deployment failed", "url": None}
    finally:
        # Cleanup temp dir
        if temp_dir:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)


def list_deployments(project_name: str) -> list:
    """List recent deployments for a project."""
    api_token = get_optional("CLOUDFLARE_API_TOKEN")
    account_id = _get_cloudflare_account_id()
    
    if not api_token or not account_id:
        return []
    
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments"
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        
        deployments = data.get("result", [])
        return [
            {
                "id": d.get("id"),
                "url": d.get("url"),
                "created_on": d.get("created_on"),
                "environment": d.get("environment"),
            }
            for d in deployments[:5]  # Last 5
        ]
    except Exception as e:
        print(f"[deploy.py] Failed to list deployments: {e}")
    
    return []
