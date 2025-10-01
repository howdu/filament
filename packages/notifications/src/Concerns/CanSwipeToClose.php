<?php

namespace Filament\Notifications\Concerns;

trait CanSwipeToClose
{
    protected bool $hasSwipeToClose = false;

    public function swipeToClose(bool $condition = true): static
    {
        $this->hasSwipeToClose = $condition;

        return $this;
    }

    public function hasSwipeToClose(): bool
    {
        return $this->hasSwipeToClose;
    }
}
