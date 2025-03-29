<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'
  import * as Sidebar from '$lib/components/ui/sidebar'

  let { user }: { user: { name: string; email: string; avatar: string } } = $props()
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
      <Avatar.Root class="h-8 w-8 rounded-lg">
        <Avatar.Image src={user.avatar} alt={user.name} />
        <Avatar.Fallback class="rounded-lg">TV</Avatar.Fallback>
      </Avatar.Root>
      <div class="grid flex-1 text-left text-sm leading-tight">
        <span class="truncate font-semibold">{user.name}</span>
        <span class="truncate text-xs">{user.email}</span>
      </div>
    </div>
  </Sidebar.MenuItem>
</Sidebar.Menu>
