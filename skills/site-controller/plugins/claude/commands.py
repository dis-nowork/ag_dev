#!/usr/bin/env python3
"""
Claude.ai Plugin - COMPLETE Interface Control
Supports: Chat, Projects, Artifacts, File Upload, Model Selection
"""

import sys
import re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.plugin import SitePlugin


class Plugin(SitePlugin):
    """Claude.ai complete control plugin"""

    async def initialize(self):
        """Navigate to Claude.ai and verify login"""
        # Only navigate if not already on claude.ai
        current_url = self.browser.page.url
        if not current_url or 'claude.ai' not in current_url:
            await self.browser.navigate(self.selectors['site_url'])
        else:
            print(f"📍 Already on Claude.ai: {current_url[:60]}...")

        # Check if logged in
        is_logged_in = await self.ensure_logged_in()
        if not is_logged_in:
            print("⚠️  Not logged in to Claude.ai")
            print("   Run: ./site-cli claude login")
            print(f"   Profile: {self.browser.profile_dir}")
            raise Exception("Authentication required")

    def get_commands(self):
        """Return available commands"""
        return {
            # Authentication
            'login': self.login,

            # Basic Chat
            'create-chat': self.create_chat,
            'send-message': self.send_message,
            'get-response': self.get_response,
            'ask': self.ask,
            'list-chats': self.list_chats,
            'search-chats': self.search_chats,
            'get-chat': self.get_chat,

            # Projects
            'create-project': self.create_project,
            'list-projects': self.list_projects,
            'open-project': self.open_project,
            'ask-in-project': self.ask_in_project,

            # File Upload
            'upload-file': self.upload_file,

            # Artifacts (CRITICAL)
            'get-artifacts': self.get_artifacts,
            'download-artifact': self.download_artifact,
            'download-all-artifacts': self.download_all_artifacts,

            # Model Selection
            'switch-model': self.switch_model,
            'get-model': self.get_model,

            # Utilities
            'screenshot': self.screenshot,
            'current-url': self.current_url,
        }

    # ========== AUTHENTICATION ==========

    async def login(self):
        """Manual login helper - opens browser and waits for you to login"""
        print("=" * 60)
        print("MANUAL LOGIN - Claude.ai")
        print("=" * 60)

        # Navigate to Claude.ai
        print("\n🌐 Navigating to Claude.ai...")
        await self.browser.navigate(self.selectors['site_url'])

        print("\nInstructions:")
        print("1. Browser is now open at Claude.ai")
        print("2. Login with your credentials in the browser")
        print("3. Press ENTER in this terminal when done")
        print("4. Your session will be saved automatically!")
        print("\n" + "=" * 60)

        # Wait for user to login
        input("\n👉 Press ENTER when you've logged in... ")

        # Verify login worked
        print("\n🔍 Verifying login...")
        is_logged_in = await self.ensure_logged_in()

        if is_logged_in:
            print("\n✅ Login successful! Session saved.")
            print(f"   Profile: {self.browser.profile_dir}")
            print("\nYou can now use:")
            print("  ./site-cli claude ask 'your question'")
            return {"status": "success", "message": "Login saved"}
        else:
            print("\n⚠️  Login verification failed.")
            print("   Please try again or check if you completed the login.")
            return {"status": "error", "message": "Not logged in"}

    # ========== BASIC CHAT ==========

    async def create_chat(self):
        """Create a new chat"""
        new_chat_btn = self.get_selector('navigation', 'new_chat_button')

        try:
            await self.browser.click(new_chat_btn)
            await self.browser.wait_seconds(1)
            print("✅ New chat created")
            return {"status": "success"}
        except Exception as e:
            print(f"❌ Failed to create chat: {e}")
            return {"status": "error", "error": str(e)}

    async def send_message(self, message: str):
        """Send a message in current chat"""
        input_selector = self.get_selector('chat', 'input')

        try:
            await self.browser.wait_for(input_selector)
            await self.browser.fill(input_selector, message)
            await self.browser.wait_seconds(0.5)
            await self.browser.press(input_selector, 'Enter')

            print(f"✅ Message sent: {message[:50]}...")
            return {"status": "success", "message": message}
        except Exception as e:
            print(f"❌ Failed to send message: {e}")
            return {"status": "error", "error": str(e)}

    async def get_response(self, timeout: int = 300):
        """Wait for and get Claude's response"""
        try:
            # Step 1: Wait for streaming to start
            print("⏳ Waiting for Claude to respond...")
            await self.browser.wait_seconds(2)

            # Step 2: Wait for streaming to complete
            # Look for streaming indicator to disappear
            max_wait = timeout
            waited = 0
            while waited < max_wait:
                try:
                    # Check if there's a streaming element
                    streaming = await self.browser.page.query_selector('[data-is-streaming="true"]')
                    if not streaming:
                        # Streaming finished
                        break
                    await self.browser.wait_seconds(1)
                    waited += 1
                except:
                    # No streaming element found, good to proceed
                    break

            # Additional wait for DOM to settle
            await self.browser.wait_seconds(2)

            # Step 3: Extract assistant's response
            # Claude.ai uses [data-is-streaming] elements, not [data-testid="assistant-message"]
            response = None

            try:
                # Get all elements that were streaming (these are Claude's responses)
                streaming_elements = await self.browser.page.query_selector_all(
                    '[data-is-streaming="false"]'
                )

                if streaming_elements and len(streaming_elements) > 0:
                    # Get the last streaming element (latest response)
                    last_response = streaming_elements[-1]

                    # Try to extract just the final answer (not thinking process)
                    # Method 1: Get the last <p> tag which contains the actual response
                    paragraphs = await last_response.query_selector_all('p')
                    if paragraphs and len(paragraphs) > 0:
                        last_p = paragraphs[-1]
                        response = await last_p.text_content()
                    else:
                        # Method 2: Get full text and extract part after "Done"
                        full_text = await last_response.text_content()
                        if "Done" in full_text:
                            response = full_text.split("Done")[-1].strip()
                        else:
                            # Fallback: use full text
                            response = full_text.strip()

                    if response:
                        response = response.strip()
                        print(f"✅ Response received ({len(response)} chars)")
                        return {"status": "success", "response": response}

            except Exception as e:
                print(f"⚠️  Failed to get response via data-is-streaming: {e}")

            # Fallback: Look for any non-user message
            if not response:
                print("⚠️  Trying fallback selectors...")

                try:
                    # Get all messages with data-testid
                    all_messages = await self.browser.page.query_selector_all(
                        '[data-testid*="message"]'
                    )

                    # Filter out user messages
                    for msg in reversed(all_messages):
                        testid = await msg.get_attribute('data-testid')
                        if testid and testid != 'user-message':
                            text = await msg.text_content()
                            if text and len(text.strip()) > 3:
                                response = text.strip()
                                print(f"   Found via fallback: {testid}")
                                break

                except Exception as e:
                    print(f"⚠️  Fallback failed: {e}")

            if response:
                print(f"✅ Response extracted ({len(response)} chars)")
                return {"status": "success", "response": response}
            else:
                print("⚠️  No response found (may still be generating)")
                return {"status": "pending", "response": ""}

        except Exception as e:
            print(f"❌ Failed to get response: {e}")
            return {"status": "error", "error": str(e)}

    async def ask(self, question: str, output: str = None):
        """
        Send message and wait for response + auto-extract artifacts

        Args:
            question: Question to ask Claude
            output: Optional delivery method - None, "file:<path>", or "clickup:<list_id>"

        Returns:
            Dict with response + artifacts info, or string for simple responses
        """
        from pathlib import Path

        # Send message
        send_result = await self.send_message(question)
        if send_result['status'] != 'success':
            return send_result

        # Wait for response
        await self.browser.wait_seconds(5)

        # Get response
        response_result = await self.get_response()

        if response_result['status'] != 'success':
            return response_result

        response = response_result['response']

        # ========== AUTO-EXTRACT ARTIFACTS (SAME SESSION!) ==========
        print("\n🔍 Auto-extracting artifacts from response...")
        await self.browser.wait_seconds(3)  # Extra time for artifacts to render

        artifacts_found = await self.get_artifacts()
        artifact_files = []

        if artifacts_found and len(artifacts_found) > 0:
            print(f"✅ Found {len(artifacts_found)} artifact(s) - downloading...")

            # Create last_artifacts directory
            artifacts_dir = Path("./last_artifacts")
            artifacts_dir.mkdir(exist_ok=True)

            # Download each artifact
            for art in artifacts_found:
                idx = art['index']
                lang = art['language']

                # Generate smart filename
                if lang == 'markdown':
                    filename = f"document_{idx}.md"
                else:
                    # Use language as filename base
                    ext_map = {
                        'python': '.py', 'javascript': '.js', 'typescript': '.ts',
                        'html': '.html', 'css': '.css', 'bash': '.sh',
                        'sql': '.sql', 'go': '.go', 'rust': '.rs',
                        'java': '.java', 'cpp': '.cpp', 'c': '.c',
                    }
                    ext = ext_map.get(lang, '.txt')
                    filename = f"artifact_{idx}{ext}"

                filepath = artifacts_dir / filename

                # Download
                download_result = await self.download_artifact(idx, str(filepath))

                if download_result.get('status') == 'success':
                    artifact_files.append({
                        'index': idx,
                        'type': art['type'],
                        'language': lang,
                        'file': str(filepath),
                        'size': art['size']
                    })
                    print(f"   ✅ Saved: {filepath}")

        # ========== PREPARE RESPONSE ==========

        # If artifacts found, return structured response
        if len(artifact_files) > 0:
            result = {
                'response': response,
                'artifacts': artifact_files
            }

            # Apply smart delivery if needed
            if output or len(response) >= 500:
                delivery = self.deliver_response(response, output)
                if isinstance(delivery, dict):
                    result['delivery'] = delivery

            return result

        # No artifacts - use smart delivery for long responses
        if output or len(response) >= 500:
            return self.deliver_response(response, output)

        # Short response, no artifacts - return string
        return response

    async def research(self, topic: str, save_to: str = None):
        """
        Research a topic with Claude and save intelligently

        Args:
            topic: Research topic/question
            save_to: Optional - "file:<path>", "clickup:<list_id>", or None (auto)

        Returns:
            Intelligent delivery based on response size
        """
        question = f"Please research and provide comprehensive information about: {topic}"
        return await self.ask(question, output=save_to)

    async def list_chats(self):
        """List recent chats"""
        try:
            # Navigate to chats page
            chats_link = self.get_selector('navigation', 'chat_history_link')
            await self.browser.click(chats_link)
            await self.browser.wait_seconds(2)

            # Extract chat titles
            chat_items = self.get_selector('history', 'chat_item_title')
            chat_titles = await self.browser.extract_all_text(chat_items)

            print(f"✅ Found {len(chat_titles)} chats")
            return chat_titles
        except Exception as e:
            print(f"❌ Failed to list chats: {e}")
            return {"status": "error", "error": str(e)}

    async def search_chats(self, query: str):
        """Search in chat history"""
        try:
            # Navigate to chats
            chats_link = self.get_selector('navigation', 'chat_history_link')
            await self.browser.click(chats_link)
            await self.browser.wait_seconds(1)

            # Find search input
            search_input = self.get_selector('history', 'search_input')
            await self.browser.fill(search_input, query)
            await self.browser.wait_seconds(2)

            # Get filtered results
            chat_items = self.get_selector('history', 'chat_item_title')
            results = await self.browser.extract_all_text(chat_items)

            print(f"✅ Found {len(results)} chats matching '{query}'")
            return results
        except Exception as e:
            print(f"❌ Search failed: {e}")
            return {"status": "error", "error": str(e)}

    async def get_chat(self, chat_id: str):
        """Get content of a specific chat"""
        try:
            # Navigate to specific chat
            await self.browser.navigate(f"https://claude.ai/chat/{chat_id}")
            await self.browser.wait_seconds(3)

            # Extract all messages
            messages = await self.browser.extract_all_text(
                self.get_selector('chat', 'message_container')
            )

            print(f"✅ Retrieved chat with {len(messages)} messages")
            return {"status": "success", "messages": messages}
        except Exception as e:
            print(f"❌ Failed to get chat: {e}")
            return {"status": "error", "error": str(e)}

    # ========== PROJECTS ==========

    async def create_project(self, name: str):
        """Create a new project"""
        try:
            # Navigate to projects
            projects_link = self.get_selector('navigation', 'projects_link')
            await self.browser.click(projects_link)
            await self.browser.wait_seconds(1)

            # Click create project
            create_btn = self.get_selector('projects', 'create_project_button')
            await self.browser.click(create_btn)
            await self.browser.wait_seconds(1)

            # Enter project name
            name_input = self.get_selector('projects', 'project_name_input')
            await self.browser.fill(name_input, name)
            await self.browser.press(name_input, 'Enter')

            await self.browser.wait_seconds(2)

            print(f"✅ Project created: {name}")
            return {"status": "success", "name": name}
        except Exception as e:
            print(f"❌ Failed to create project: {e}")
            return {"status": "error", "error": str(e)}

    async def list_projects(self):
        """List all projects"""
        try:
            # Navigate to projects
            projects_link = self.get_selector('navigation', 'projects_link')
            await self.browser.click(projects_link)
            await self.browser.wait_seconds(2)

            # Extract project titles
            project_titles = self.get_selector('projects', 'project_title')
            projects = await self.browser.extract_all_text(project_titles)

            print(f"✅ Found {len(projects)} projects")
            return projects
        except Exception as e:
            print(f"❌ Failed to list projects: {e}")
            return {"status": "error", "error": str(e)}

    async def open_project(self, name: str):
        """Open a specific project"""
        try:
            # List projects first
            projects = await self.list_projects()

            if isinstance(projects, dict) and projects.get('status') == 'error':
                return projects

            # Find matching project
            matching = [p for p in projects if name.lower() in p.lower()]

            if not matching:
                print(f"❌ Project '{name}' not found")
                return {"status": "error", "error": "Project not found"}

            # Click on first match
            # This is simplified - would need to click the actual project element
            print(f"✅ Found project: {matching[0]}")
            return {"status": "success", "project": matching[0]}

        except Exception as e:
            print(f"❌ Failed to open project: {e}")
            return {"status": "error", "error": str(e)}

    async def ask_in_project(self, project_name: str, message: str):
        """Ask a question within a specific project context"""
        try:
            # Open project
            open_result = await self.open_project(project_name)
            if open_result.get('status') == 'error':
                return open_result

            # Ask question
            return await self.ask(message)

        except Exception as e:
            print(f"❌ Failed to ask in project: {e}")
            return {"status": "error", "error": str(e)}

    # ========== FILE UPLOAD ==========

    async def upload_file(self, filepath: str):
        """Upload a file (PDF, image, code) before asking"""
        try:
            file_path = Path(filepath)

            if not file_path.exists():
                print(f"❌ File not found: {filepath}")
                return {"status": "error", "error": "File not found"}

            # Supported extensions
            supported = ['.pdf', '.txt', '.csv', '.py', '.js', '.html', '.png', '.jpg', '.jpeg']
            if file_path.suffix.lower() not in supported:
                print(f"⚠️  File type {file_path.suffix} may not be supported")

            # Find file input
            file_input = self.get_selector('chat', 'file_input')

            # Upload file
            await self.browser.page.set_input_files(file_input, str(file_path.absolute()))

            await self.browser.wait_seconds(2)

            print(f"✅ File uploaded: {file_path.name}")
            return {"status": "success", "file": str(file_path)}

        except Exception as e:
            print(f"❌ File upload failed: {e}")
            return {"status": "error", "error": str(e)}

    # ========== ARTIFACTS (CRITICAL) ==========

    async def extract_code_blocks(self):
        """
        Extract code blocks from assistant's last message (inline in chat)

        Returns list of {language, content, type='code_block'}
        """
        code_blocks = []

        # Try multiple selectors for assistant's code blocks
        selectors_to_try = [
            "div[data-is-streaming='false'] pre code",  # Response container
            "[data-testid='assistant-message'] pre code",  # Assistant message
            "pre code[class*='language-']",  # Any code with language class
            "pre code",  # Generic code blocks
        ]

        for selector in selectors_to_try:
            elements = await self.browser.page.query_selector_all(selector)

            if len(elements) > 0:
                print(f"   Found {len(elements)} code blocks with: {selector}")

                for idx, code_block in enumerate(elements):
                    # Get language from class
                    class_attr = await code_block.get_attribute('class') or ""
                    language = "text"

                    match = re.search(r'language-(\w+)', class_attr)
                    if match:
                        language = match.group(1)

                    # Get content
                    content = await code_block.text_content()

                    # Skip empty or tiny blocks
                    if not content or len(content.strip()) < 10:
                        continue

                    # Skip user input echo
                    first_line = content.strip().split('\n')[0]
                    if any(first_line.startswith(skip) for skip in ["Say only", "Create", "Write a"]):
                        continue

                    code_blocks.append({
                        'index': len(code_blocks),
                        'language': language,
                        'content': content,
                        'size': len(content),
                        'preview': content[:100],
                        'type': 'code_block'
                    })

                break  # Found blocks, stop trying other selectors

        return code_blocks

    async def extract_text_artifacts(self):
        """
        Extract text artifacts from sidebar panel (essays, documents, etc)

        Returns list of {language='markdown', content, type='text_artifact'}
        """
        text_artifacts = []

        # Try selectors for text artifact panel
        selectors_to_try = [
            "div[data-testid='artifact-content']",
            "div[class*='artifact'] .prose",
            "div[class*='artifact-panel']",
            "aside[class*='artifact']",
        ]

        for selector in selectors_to_try:
            panels = await self.browser.page.query_selector_all(selector)

            if len(panels) > 0:
                print(f"   Found {len(panels)} text artifact panel(s) with: {selector}")

                for idx, panel in enumerate(panels):
                    # Extract structured content as markdown
                    markdown_content = []

                    # Get all text elements
                    h1_elements = await panel.query_selector_all('h1')
                    h2_elements = await panel.query_selector_all('h2')
                    h3_elements = await panel.query_selector_all('h3')
                    p_elements = await panel.query_selector_all('p')
                    li_elements = await panel.query_selector_all('li')

                    # Convert to markdown
                    for h1 in h1_elements:
                        text = await h1.text_content()
                        markdown_content.append(f"# {text.strip()}\n")

                    for h2 in h2_elements:
                        text = await h2.text_content()
                        markdown_content.append(f"## {text.strip()}\n")

                    for h3 in h3_elements:
                        text = await h3.text_content()
                        markdown_content.append(f"### {text.strip()}\n")

                    for p in p_elements:
                        text = await p.text_content()
                        if text.strip():
                            markdown_content.append(f"{text.strip()}\n\n")

                    for li in li_elements:
                        text = await li.text_content()
                        markdown_content.append(f"- {text.strip()}\n")

                    # Combine
                    full_content = "".join(markdown_content)

                    if len(full_content.strip()) > 50:  # Minimum content
                        text_artifacts.append({
                            'index': len(text_artifacts),
                            'language': 'markdown',
                            'content': full_content,
                            'size': len(full_content),
                            'preview': full_content[:100],
                            'type': 'text_artifact'
                        })

                break  # Found artifacts, stop trying

        return text_artifacts

    async def get_artifacts(self):
        """
        List all artifacts/code blocks/text documents in the current chat

        Extraction strategies (in order):
        1. Visual artifacts (sidebar panels) - code or text
        2. Text artifacts (documents, essays in sidebar)
        3. Code blocks (inline in chat messages)

        Returns: List of dicts with {index, language, size, preview, type, content}
        """
        try:
            await self.browser.wait_seconds(2)

            # Debug: Take screenshot first
            try:
                await self.browser.page.screenshot(path='artifacts_debug.png')
                print("📸 Debug screenshot saved: artifacts_debug.png")
            except:
                pass

            all_artifacts = []

            # ========== STRATEGY 1: Visual Code Artifacts ==========
            print("🔍 Strategy 1: Looking for visual code artifacts...")

            visual_code_selectors = [
                "div[data-testid='artifact'] pre code",
                "div[class*='artifact'] pre code",
            ]

            for selector in visual_code_selectors:
                found = await self.browser.page.query_selector_all(selector)
                if len(found) > 0:
                    print(f"   ✅ Found {len(found)} visual code artifact(s)")

                    for idx, elem in enumerate(found):
                        class_attr = await elem.get_attribute('class') or ""
                        language = "text"

                        match = re.search(r'language-(\w+)', class_attr)
                        if match:
                            language = match.group(1)

                        content = await elem.text_content()

                        all_artifacts.append({
                            'index': len(all_artifacts),
                            'language': language,
                            'content': content,
                            'size': len(content),
                            'preview': content[:100],
                            'type': 'visual_artifact'
                        })
                    break

            # ========== STRATEGY 2: Text Artifacts (Sidebar Documents) ==========
            if len(all_artifacts) == 0:
                print("\n🔍 Strategy 2: Looking for text artifacts (documents)...")
                text_artifacts = await self.extract_text_artifacts()

                if len(text_artifacts) > 0:
                    print(f"   ✅ Found {len(text_artifacts)} text artifact(s)")
                    all_artifacts.extend(text_artifacts)

            # ========== STRATEGY 3: Code Blocks (Inline in Chat) ==========
            if len(all_artifacts) == 0:
                print("\n🔍 Strategy 3: Looking for code blocks in chat...")
                code_blocks = await self.extract_code_blocks()

                if len(code_blocks) > 0:
                    print(f"   ✅ Found {len(code_blocks)} code block(s)")
                    all_artifacts.extend(code_blocks)

            # ========== RESULTS ==========
            if len(all_artifacts) == 0:
                print("\n⚠️  No artifacts, documents, or code blocks found")
                print("   Claude responded with plain text only")
                return []

            print(f"\n✅ Total found: {len(all_artifacts)} item(s)")
            for art in all_artifacts:
                print(f"   [{art['index']}] {art['language']} - {art['type']} ({art['size']} chars)")

            return all_artifacts

        except Exception as e:
            print(f"❌ Failed to get artifacts: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def download_artifact(self, index: int, output_path: str):
        """
        Download a specific artifact/code block to local file

        Works with both visual artifacts and code blocks
        """
        try:
            # Get all artifacts using same logic as get_artifacts()
            artifacts_data = await self.get_artifacts()

            if not artifacts_data or len(artifacts_data) == 0:
                print("❌ No artifacts found to download")
                return {"status": "error", "error": "No artifacts found"}

            if index >= len(artifacts_data):
                print(f"❌ Index {index} out of range (found {len(artifacts_data)} artifacts)")
                return {"status": "error", "error": "Index out of range"}

            # Get artifact metadata
            artifact_info = artifacts_data[index]
            language = artifact_info['language']
            artifact_type = artifact_info['type']

            print(f"📥 Downloading artifact {index} ({language} - {artifact_type})...")

            # Now get the actual DOM element to extract content
            if artifact_type == 'visual_artifact':
                # Try visual artifact selectors
                visual_selectors = [
                    "div[data-testid='artifact']",
                    "div[class*='artifact']",
                    "[data-testid*='artifact']"
                ]

                element = None
                for selector in visual_selectors:
                    elements = await self.browser.page.query_selector_all(selector)
                    if elements and index < len(elements):
                        element = elements[index]
                        break

            else:  # code_block
                # Get code blocks
                code_blocks = await self.browser.page.query_selector_all('pre code')

                # Filter same way as get_artifacts()
                valid_blocks = []
                for block in code_blocks:
                    content = await block.text_content()
                    if content and len(content.strip()) >= 10:
                        if not (content.strip().startswith("Say only") or content.strip().startswith("Create")):
                            valid_blocks.append(block)

                if index < len(valid_blocks):
                    element = valid_blocks[index]
                else:
                    element = None

            if not element:
                print(f"❌ Could not find element for artifact {index}")
                return {"status": "error", "error": "Element not found"}

            # Extract content
            content = await element.text_content()

            # Extension mapping (comprehensive)
            ext_map = {
                'python': '.py',
                'py': '.py',
                'javascript': '.js',
                'js': '.js',
                'typescript': '.ts',
                'ts': '.ts',
                'html': '.html',
                'css': '.css',
                'scss': '.scss',
                'sass': '.sass',
                'json': '.json',
                'yaml': '.yaml',
                'yml': '.yml',
                'markdown': '.md',
                'md': '.md',
                'bash': '.sh',
                'shell': '.sh',
                'sh': '.sh',
                'sql': '.sql',
                'jsx': '.jsx',
                'tsx': '.tsx',
                'go': '.go',
                'rust': '.rs',
                'rs': '.rs',
                'java': '.java',
                'c': '.c',
                'cpp': '.cpp',
                'cxx': '.cpp',
                'c++': '.cpp',
                'php': '.php',
                'ruby': '.rb',
                'rb': '.rb',
                'swift': '.swift',
                'kotlin': '.kt',
                'scala': '.scala',
                'r': '.r',
                'matlab': '.m',
                'perl': '.pl',
                'lua': '.lua',
                'text': '.txt',
                'txt': '.txt',
            }

            # Determine output path
            output = Path(output_path)

            # If no extension provided, add based on language
            if not output.suffix:
                ext = ext_map.get(language, '.txt')
                output = output.with_suffix(ext)

            # Ensure directory exists
            output.parent.mkdir(parents=True, exist_ok=True)

            # Write content
            output.write_text(content, encoding='utf-8')

            print(f"✅ Artifact saved: {output}")
            print(f"   Language: {language}")
            print(f"   Size: {len(content)} chars")

            return {
                "status": "success",
                "path": str(output),
                "language": language,
                "size": len(content)
            }

        except Exception as e:
            print(f"❌ Failed to download artifact: {e}")
            return {"status": "error", "error": str(e)}

    async def download_all_artifacts(self, output_dir: str):
        """Download all artifacts in current chat"""
        try:
            artifacts = await self.get_artifacts()

            if isinstance(artifacts, dict) and artifacts.get('status') == 'error':
                return artifacts

            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

            downloaded = []

            for art in artifacts:
                idx = art['index']
                lang = art['language']

                # Generate filename
                filename = f"artifact_{idx}_{lang}"

                filepath = output_path / filename

                result = await self.download_artifact(idx, str(filepath))

                if result.get('status') == 'success':
                    downloaded.append(result['path'])

            print(f"\n✅ Downloaded {len(downloaded)} artifacts to {output_dir}")
            return {"status": "success", "files": downloaded}

        except Exception as e:
            print(f"❌ Failed to download all artifacts: {e}")
            return {"status": "error", "error": str(e)}

    # ========== MODEL SELECTION ==========

    async def switch_model(self, model: str):
        """Switch between Opus/Sonnet/Haiku"""
        try:
            model = model.lower()

            if model not in ['opus', 'sonnet', 'haiku']:
                print(f"❌ Invalid model: {model}")
                print("   Valid options: opus, sonnet, haiku")
                return {"status": "error", "error": "Invalid model"}

            # Click model dropdown
            dropdown = self.get_selector('model_selector', 'model_dropdown')
            await self.browser.click(dropdown)
            await self.browser.wait_seconds(1)

            # Select model
            model_option = self.get_selector('model_selector', f'{model}_option')
            await self.browser.click(model_option)

            await self.browser.wait_seconds(1)

            print(f"✅ Switched to {model.capitalize()}")
            return {"status": "success", "model": model}

        except Exception as e:
            print(f"❌ Failed to switch model: {e}")
            return {"status": "error", "error": str(e)}

    async def get_model(self):
        """Get currently selected model"""
        try:
            dropdown = self.get_selector('model_selector', 'model_dropdown')
            text = await self.browser.extract_text(dropdown)

            model = "unknown"
            if 'opus' in text.lower():
                model = 'opus'
            elif 'sonnet' in text.lower():
                model = 'sonnet'
            elif 'haiku' in text.lower():
                model = 'haiku'

            print(f"Current model: {model}")
            return model

        except Exception as e:
            print(f"❌ Failed to get model: {e}")
            return {"status": "error", "error": str(e)}

    # ========== UTILITIES ==========

    async def screenshot(self, output_path: str = "claude-screenshot.png"):
        """Take screenshot of current page"""
        try:
            await self.browser.screenshot(output_path, full_page=True)
            print(f"✅ Screenshot saved: {output_path}")
            return {"status": "success", "path": output_path}
        except Exception as e:
            print(f"❌ Failed to take screenshot: {e}")
            return {"status": "error", "error": str(e)}

    async def current_url(self):
        """Get current URL"""
        url = self.browser.get_current_url()
        print(f"Current URL: {url}")
        return url

    # ========== SMART DELIVERY ==========

    def deliver_response(self, response: str, output: str = None):
        """
        Intelligent response delivery based on size and output destination

        Args:
            response: The response text from Claude
            output: Delivery method - None, "file:<path>", or "clickup:<list_id>"

        Returns:
            - For short responses (<500 chars): returns string directly
            - For long responses without output: saves to /tmp/claude_response_{timestamp}.md
            - For "file:<path>": saves to specified path
            - For "clickup:<list_id>": creates ClickUp task and returns URL
        """
        import time
        from pathlib import Path

        # Parse output parameter
        if output and ':' in output:
            output_type, output_value = output.split(':', 1)
        else:
            output_type = None
            output_value = None

        # Short response - return directly
        if len(response) < 500 and not output:
            print(f"📝 Short response ({len(response)} chars) - returning directly")
            return response

        # ClickUp delivery
        if output_type == "clickup":
            list_id = output_value
            print(f"📤 Sending to ClickUp list {list_id}...")

            # Extract title from first line or use default
            lines = response.split('\n')
            title = lines[0][:100] if lines else "Claude Response"

            result = self.save_to_clickup(response, title, list_id)
            if result.get('status') == 'success':
                task_url = result.get('url')
                print(f"✅ Saved to ClickUp: {task_url}")
                return {"type": "clickup", "url": task_url, "content": response}
            else:
                print(f"❌ ClickUp save failed: {result.get('error')}")
                return {"type": "error", "error": result.get('error')}

        # File delivery
        if output_type == "file":
            filepath = Path(output_value).expanduser()
        else:
            # Auto-save long responses
            timestamp = int(time.time())
            filepath = Path(f"/tmp/claude_response_{timestamp}.md")

        # Save to file
        try:
            filepath.parent.mkdir(parents=True, exist_ok=True)
            filepath.write_text(response, encoding='utf-8')
            print(f"💾 Saved to file: {filepath} ({len(response)} chars)")
            return {"type": "file", "path": str(filepath), "size": len(response)}
        except Exception as e:
            print(f"❌ Failed to save file: {e}")
            return {"type": "error", "error": str(e)}

    def save_to_clickup(self, content: str, title: str, list_id: str):
        """
        Save content to ClickUp as a task

        Args:
            content: Task description (markdown supported)
            title: Task name/title
            list_id: ClickUp list ID

        Returns:
            {"status": "success", "url": "task_url"} or error dict
        """
        import requests

        API_TOKEN = "pk_112033376_1G0TX5Z3104A9KB46JNG68BKQFI0LPG3"
        API_URL = f"https://api.clickup.com/api/v2/list/{list_id}/task"

        headers = {
            "Authorization": API_TOKEN,
            "Content-Type": "application/json"
        }

        payload = {
            "name": title,
            "description": content,
            "markdown_description": content
        }

        try:
            response = requests.post(API_URL, json=payload, headers=headers)

            if response.status_code == 200:
                task_data = response.json()
                task_url = task_data.get('url', f"https://app.clickup.com/t/{task_data.get('id')}")
                return {"status": "success", "url": task_url, "task_id": task_data.get('id')}
            else:
                return {
                    "status": "error",
                    "error": f"API returned {response.status_code}: {response.text}"
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}
