import { once } from 'alpinejs/src/utils/once'

export default (Alpine) => {
    Alpine.data('notificationComponent', ({ notification }) => ({
        isShown: false,

        computedStyle: null,

        transitionDuration: null,

        transitionEasing: null,

        startX: 0,

        startY: 0,

        currentX: 0,

        isDragging: false,

        shouldCloseAfterDrag: false,

        threshold: 0.3,

        minSwipeDistance: 25,

        dragStarted: false,

        autoCloseTimer: null,

        autoCloseStart: null,

        autoCloseRemaining: null,

        // Added bound handler references so we can properly remove them.
        boundHandleTouchStart: null,
        boundHandleTouchMove: null,
        boundHandleTouchEnd: null,
        boundHandleTouchCancel: null,

        init() {
            this.computedStyle = window.getComputedStyle(this.$el)

            this.transitionDuration =
                parseFloat(this.computedStyle.transitionDuration) * 1000

            this.transitionEasing = this.computedStyle.transitionTimingFunction

            this.configureTransitions()
            this.configureAnimations()

            if (
                notification.duration &&
                notification.duration !== 'persistent'
            ) {
                this.autoCloseRemaining = notification.duration

                this.startAutoCloseTimer()
            }

            if (notification.hasSwipeToClose) {
                this.boundHandleTouchStart = this.handleTouchStart.bind(this)
                this.boundHandleTouchMove = this.handleTouchMove.bind(this)
                this.boundHandleTouchEnd = this.handleTouchEnd.bind(this)
                this.boundHandleTouchCancel = this.handleTouchCancel.bind(this)

                this.$el.addEventListener(
                    'touchstart',
                    this.boundHandleTouchStart,
                    { passive: false },
                )
                this.$el.addEventListener(
                    'touchmove',
                    this.boundHandleTouchMove,
                    { passive: false },
                )
                this.$el.addEventListener(
                    'touchend',
                    this.boundHandleTouchEnd,
                    { passive: false },
                )
                this.$el.addEventListener(
                    'touchcancel',
                    this.boundHandleTouchCancel,
                    { passive: false },
                )
            }

            this.isShown = true
        },

        configureTransitions() {
            const display = this.computedStyle.display

            const show = () => {
                Alpine.mutateDom(() => {
                    this.$el.style.setProperty('display', display)
                    this.$el.style.setProperty('visibility', 'visible')
                })
                this.$el._x_isShown = true
            }

            const hide = () => {
                Alpine.mutateDom(() => {
                    this.$el._x_isShown
                        ? this.$el.style.setProperty('visibility', 'hidden')
                        : this.$el.style.setProperty('display', 'none')
                })
            }

            const toggle = once(
                (value) => (value ? show() : hide()),
                (value) => {
                    this.$el._x_toggleAndCascadeWithTransitions(
                        this.$el,
                        value,
                        show,
                        hide,
                    )
                },
            )

            Alpine.effect(() => toggle(this.isShown))
        },

        configureAnimations() {
            let animation

            Livewire.hook(
                'commit',
                ({ component, commit, succeed, fail, respond }) => {
                    if (
                        !component.snapshot.data
                            .isFilamentNotificationsComponent
                    ) {
                        return
                    }

                    // Calling `el.getBoundingClientRect()` from outside `requestAnimationFrame()` can
                    // occasionally cause the page to scroll to the top.
                    requestAnimationFrame(() => {
                        const getTop = () =>
                            this.$el.getBoundingClientRect().top
                        const oldTop = getTop()

                        respond(() => {
                            animation = () => {
                                if (!this.isShown) {
                                    return
                                }

                                this.$el.animate(
                                    [
                                        {
                                            transform: `translateY(${oldTop - getTop()}px)`,
                                        },
                                        { transform: 'translateY(0px)' },
                                    ],
                                    {
                                        duration: this.transitionDuration,
                                        easing: this.transitionEasing,
                                    },
                                )
                            }

                            this.$el
                                .getAnimations()
                                .forEach((animation) => animation.finish())
                        })

                        succeed(({ snapshot, effect }) => {
                            animation()
                        })
                    })
                },
            )
        },

        close() {
            this.clearAutoCloseTimer()

            if (this.isDragging) {
                this.shouldCloseAfterDrag = true

                return
            }

            this.isShown = false

            setTimeout(
                () =>
                    window.dispatchEvent(
                        new CustomEvent('notificationClosed', {
                            detail: {
                                id: notification.id,
                            },
                        }),
                    ),
                this.transitionDuration,
            )
        },

        markAsRead() {
            window.dispatchEvent(
                new CustomEvent('markedNotificationAsRead', {
                    detail: {
                        id: notification.id,
                    },
                }),
            )
        },

        markAsUnread() {
            window.dispatchEvent(
                new CustomEvent('markedNotificationAsUnread', {
                    detail: {
                        id: notification.id,
                    },
                }),
            )
        },

        handleTouchStart(event) {
            if (event.touches.length > 1) return

            this.startDrag(event.touches[0].clientX, event.touches[0].clientY)
            // Removed preventDefault from touchstart per updated requirements.
        },

        handleTouchMove(event) {
            if (!this.isDragging || event.touches.length > 1) return

            this.updateDrag(event.touches[0].clientX, event.touches[0].clientY)

            // Only prevent default if a horizontal drag has been detected (dragStarted true).
            if (this.dragStarted) {
                event.preventDefault()
            }
        },

        handleTouchEnd(event) {
            this.endDrag()

            event.preventDefault()
        },

        handleTouchCancel(event) {
            this.resetTransform()

            this.isDragging = false
        },

        handleMouseStart(event) {
            if (event.button !== 0) return

            this.startDrag(event.clientX, event.clientY)
            event.preventDefault()
        },

        handleMouseMove(event) {
            if (!this.isDragging) return

            this.updateDrag(event.clientX, event.clientY)

            event.preventDefault()
        },

        handleMouseEnd(event) {
            this.endDrag()

            event.preventDefault()
        },

        startDrag(x, y) {
            this.startX = x
            this.startY = y
            this.currentX = x
            this.isDragging = true
            this.dragStarted = false

            this.$el.style.setProperty('will-change', 'transform, opacity')
            this.$el.style.removeProperty('transition')
            this.$el.style.cursor = 'grabbing'

            if (this.autoCloseTimer) {
                this.autoCloseRemaining -= Date.now() - this.autoCloseStart

                this.clearAutoCloseTimer()
            }
        },

        updateDrag(x, y) {
            if (!this.isDragging) return

            this.currentX = x

            const deltaX = this.currentX - this.startX
            const deltaY = y - this.startY

            if (Math.abs(deltaX) < 2 * Math.abs(deltaY)) {
                this.$el.style.removeProperty('transform')
                this.$el.style.removeProperty('opacity')
                this.$el.style.removeProperty('transition')

                this.dragStarted = false

                return
            }

            const width = this.$el.offsetWidth
            const dragPercentage = Math.abs(deltaX) / width
            const opacity = Math.max(0.3, 1 - dragPercentage)
            const currentTransform = this.$el.style.transform
            const newTransform = `translate3d(${deltaX}px,0,0)`

            if (currentTransform !== newTransform) {
                this.$el.style.setProperty('transform', newTransform)
            }

            if (this.$el.style.opacity !== opacity) {
                this.$el.style.setProperty('opacity', opacity)
            }

            this.$el.style.removeProperty('transition')

            this.dragStarted = true
        },

        endDrag() {
            if (!this.isDragging) return

            this.$el.style.cursor = ''

            const deltaX = this.currentX - this.startX
            const width = this.$el.offsetWidth
            const dragPercentage = Math.abs(deltaX) / width

            if (
                this.dragStarted &&
                Math.abs(deltaX) > this.minSwipeDistance &&
                dragPercentage >= this.threshold
            ) {
                this.$el.style.setProperty(
                    'transform',
                    `translate3d(${deltaX > 0 ? width : -width}px,0,0)`,
                )
                this.$el.style.setProperty('opacity', 0)
                this.$el.style.setProperty(
                    'transition',
                    'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                )

                setTimeout(() => {
                    this.close()
                    this.resetTransform()
                }, 300)

                this.isDragging = false

                setTimeout(() => {
                    this.$el.style.removeProperty('will-change')
                }, 350)

                return
            }

            this.resetPosition()

            this.isDragging = false

            if (this.shouldCloseAfterDrag) {
                this.shouldCloseAfterDrag = false
                this.close()
            }

            setTimeout(() => {
                this.$el.style.removeProperty('will-change')
            }, 350)

            if (
                !this.isDragging &&
                this.autoCloseRemaining > 0 &&
                this.isShown
            ) {
                this.startAutoCloseTimer()
            }
        },

        resetPosition() {
            if (!this.isDragging) {
                this.resetTransform()

                return
            }

            this.$el.style.setProperty('transform', 'translate3d(0px,0,0)')
            this.$el.style.setProperty('opacity', 1)
            this.$el.style.setProperty(
                'transition',
                'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            )

            setTimeout(() => {
                this.resetTransform()
            }, 300)
        },

        resetTransform() {
            this.$el.style.removeProperty('transform')
            this.$el.style.removeProperty('opacity')
            this.$el.style.removeProperty('transition')
            this.$el.style.removeProperty('will-change')

            this.$el.style.cursor = ''
        },

        startAutoCloseTimer() {
            this.clearAutoCloseTimer()

            this.autoCloseStart = Date.now()

            this.autoCloseTimer = setTimeout(() => {
                if (!this.$el.matches(':hover')) {
                    if (this.isDragging) {
                        this.shouldCloseAfterDrag = true
                    } else {
                        this.close()
                    }
                    return
                }

                this.$el.addEventListener('mouseleave', () => this.close())
            }, this.autoCloseRemaining)
        },

        clearAutoCloseTimer() {
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer)

                this.autoCloseTimer = null
            }
        },

        destroy() {
            this.clearAutoCloseTimer()

            if (notification.hasSwipeToClose) {
                this.$el.removeEventListener(
                    'touchstart',
                    this.boundHandleTouchStart,
                )
                this.$el.removeEventListener(
                    'touchmove',
                    this.boundHandleTouchMove,
                )
                this.$el.removeEventListener(
                    'touchend',
                    this.boundHandleTouchEnd,
                )
                this.$el.removeEventListener(
                    'touchcancel',
                    this.boundHandleTouchCancel,
                )
            }
        },
    }))
}
