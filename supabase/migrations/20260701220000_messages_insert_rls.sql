-- Add INSERT policy for messages table
-- Applied to fix custom project request submission failures (messages insert was failing)

-- Policy: Users can insert messages in their collabs
DROP POLICY IF EXISTS "Users can insert collab messages" ON public.messages;
CREATE POLICY "Users can insert collab messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collabs
      WHERE collabs.id = messages.collab_id
        AND (collabs.buyer_id = auth.uid() OR collabs.builder_id = auth.uid())
    )
  );
