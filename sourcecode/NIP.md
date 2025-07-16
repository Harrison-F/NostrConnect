# Nostr Connect Lists

This document describes how Nostr Connect uses existing Nostr protocols to implement user-created follow lists with advanced features.

## Implementation

Nostr Connect uses **NIP-51 Follow sets** (kind 30000) to create and manage user lists. This ensures full interoperability with existing Nostr clients that support NIP-51.

### Event Structure

#### Regular List
```json
{
  "kind": 30000,
  "content": "",
  "tags": [
    ["d", "<unique-list-id>"],
    ["title", "<list-name>"],
    ["description", "<optional-description>"],
    ["p", "<pubkey1>"],
    ["p", "<pubkey2>"],
    ["p", "<pubkey3>"],
    ["a", "30000:<creator-pubkey>:<child-list-id>"]
  ]
}
```

#### Folder (Parent List)
```json
{
  "kind": 30000,
  "content": "",
  "tags": [
    ["d", "<unique-folder-id>"],
    ["title", "<folder-name>"],
    ["description", "<optional-description>"],
    ["folder", ""],
    ["a", "30000:<creator-pubkey>:<child-list-id>"],
    ["a", "30000:<creator-pubkey>:<another-child-list-id>"]
  ]
}
```

### Required Tags

- `d`: Unique identifier for the list/folder (generated randomly)
- `title`: Human-readable name for the list/folder

### Optional Tags

- `description`: Optional description of the list/folder's purpose
- `p`: Public keys of users in the list (only for regular lists, not folders)
- `folder`: Empty tag indicating this is a folder (cannot contain users)
- `a`: References to child lists (for hierarchical organization)
- `alt`: Human-readable description for NIP-31 compatibility

### List Management

1. **Creating Lists/Folders**:
   - Regular lists: Can contain users and be organized hierarchically
   - Folders: Act as containers for organizing lists, cannot contain users directly
2. **Adding Members**:
   - List creators can add members by pubkey or npub (regular lists only)
   - Any user can add themselves to any regular list
   - Folders cannot contain users, only other lists
3. **Hierarchical Organization**:
   - Lists can be added to parent folders using `a` tags
   - Folders serve as organizational containers
   - Nested structure with expand/collapse functionality
4. **Permissions**: Only the original creator can edit the title, description, and manage membership

### Social Features

#### Following
- Users can follow/unfollow other users directly from lists
- Uses standard NIP-02 follow lists (kind 3)
- Real-time follow status updates

#### Zapping
- Direct zapping of users from lists
- Site donation functionality
- Uses NIP-57 zap requests (kind 9734)

### URL Structure

Lists are accessible via SEO-friendly URLs:
```
https://nostr-connect.example.com/list/<list-id>/<url-friendly-title>
```

Where:
- `<list-id>` corresponds to the `d` tag value
- `<url-friendly-title>` is a URL-safe version of the list title

### User Dashboard

Users can view their lists organized by:
- **Created Lists**: Lists they've created (with creator privileges)
- **Joined Lists**: Lists they've joined but didn't create
- Chronological ordering by creation date

### Parent-Child List Relationships

Lists can be organized hierarchically:
- Child lists reference parent lists via `a` tags
- Parent lists display their child lists
- Enables complex organizational structures

### Interoperability

Since Nostr Connect uses standard NIP-51 Follow sets, these lists are fully compatible with:
- Any Nostr client that supports NIP-51
- Existing follow list management tools
- Standard Nostr relay implementations
- NIP-02 follow lists
- NIP-57 zap functionality

## Benefits

- **No custom kinds**: Uses existing, well-supported Nostr protocols
- **Full interoperability**: Works with any NIP-51 compatible client
- **Decentralized**: No central server required for list storage
- **Permissionless**: Anyone can create and share lists
- **Self-sovereign**: Users control their own list memberships
- **Social integration**: Built-in following and zapping
- **Hierarchical organization**: Support for complex list structures
- **SEO-friendly URLs**: Shareable links with list names